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

const runId = `verify_${Date.now()}`;
const samples = [
  {
    id: `img_${Date.now()}_1`,
    fileName: `sample-cat-${runId}.jpg`,
    fileUrl: 'https://picsum.photos/id/237/800/600',
    thumbnailUrl: 'https://picsum.photos/id/237/400/300',
  },
  {
    id: `img_${Date.now()}_2`,
    fileName: `sample-mountain-${runId}.jpg`,
    fileUrl: 'https://picsum.photos/id/1018/800/600',
    thumbnailUrl: 'https://picsum.photos/id/1018/400/300',
  },
];

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }
  throw new Error(`Unsupported Firestore type: ${typeof value}`);
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

async function createFirestoreDoc(idToken, collectionName, documentId, payload) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?documentId=${documentId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, encodeFirestoreValue(value)])
      ),
    }),
  });

  if (!response.ok) {
    throw new Error(`Firestore create failed for ${collectionName}/${documentId}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  const auth = await signInAnonymously();
  const idToken = auth.idToken;
  const now = new Date().toISOString();

  const results = [];

  for (const sample of samples) {
    const payload = {
      folderId: null,
      fileName: sample.fileName,
      fileType: 'image/jpeg',
      originalFileSize: 250000,
      compressedFileSize: 250000,
      fileUrl: sample.fileUrl,
      thumbnailUrl: sample.thumbnailUrl,
      storagePath: '',
      textContent: '',
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    await createFirestoreDoc(idToken, 'files', sample.id, payload);

    results.push({
      id: sample.id,
      fileName: sample.fileName,
      fileUrl: sample.fileUrl,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    projectId,
    runId,
    created: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
