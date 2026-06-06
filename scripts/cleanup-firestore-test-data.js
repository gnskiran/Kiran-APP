const fs = require('fs');
const path = require('path');

const googleServicesPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');
const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));

const projectId = googleServices.project_info.project_id;
const apiKey = googleServices.client?.[0]?.api_key?.[0]?.current_key;

if (!projectId || !apiKey) {
  console.error('Missing Firebase project configuration.');
  process.exit(1);
}

const collections = ['folders', 'files', 'links', 'passwords', 'images', 'pdfs'];
const shouldDelete = process.argv.includes('--apply');

function decodeValue(value) {
  if (value === null || value === undefined) return value;

  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;

  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(decodeValue);
  }

  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, child]) => [key, decodeValue(child)]));
  }

  return value;
}

function decodeDocument(doc) {
  const fields = doc.fields || {};
  const decoded = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
  return {
    id: doc.name.split('/').pop(),
    name: doc.name,
    ...decoded,
  };
}

async function signInAnonymously() {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });

  if (!response.ok) {
    throw new Error(`Anonymous sign-in failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function fetchCollection(idToken, collectionName) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      return { documents: [], error: `PERMISSION_DENIED for ${collectionName}` };
    }

    throw new Error(`Failed to fetch ${collectionName}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return {
    documents: data
      .filter(item => item.document)
      .map(item => decodeDocument(item.document))
      .map(doc => ({ ...doc, collection: collectionName })),
    error: null,
  };
}

function collectStringValues(value, acc = []) {
  if (typeof value === 'string') {
    acc.push(value);
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectStringValues(item, acc));
    return acc;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectStringValues(item, acc));
  }

  return acc;
}

function isTestDocument(doc) {
  const strings = collectStringValues(doc).map(value => value.toLowerCase());

  return strings.some(value => (
    value.includes('verify_') ||
    value.includes('verification ') ||
    value.includes('sample website login verify_')
  ));
}

async function deleteDocument(idToken, doc) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${doc.name}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete ${doc.collection}/${doc.id}: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  const auth = await signInAnonymously();
  const idToken = auth.idToken;
  const scanResults = await Promise.all(collections.map(name => fetchCollection(idToken, name)));
  const documents = scanResults.flatMap(result => result.documents);
  const inaccessibleCollections = scanResults.filter(result => result.error).map(result => result.error);
  const matches = documents.filter(isTestDocument);

  console.log(JSON.stringify({
    projectId,
    scannedCollections: collections,
    inaccessibleCollections,
    totalDocumentsScanned: documents.length,
    totalMatches: matches.length,
    matches: matches.map(doc => ({
      collection: doc.collection,
      id: doc.id,
      folderName: doc.folderName || null,
      fileName: doc.fileName || null,
      title: doc.title || null,
      deleted: doc.deleted ?? null,
    })),
    mode: shouldDelete ? 'apply' : 'dry-run',
  }, null, 2));

  if (!shouldDelete) {
    return;
  }

  for (const doc of matches) {
    await deleteDocument(idToken, doc);
  }

  console.log(JSON.stringify({
    deleted: matches.length,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
