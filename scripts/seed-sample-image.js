const fs = require('fs');
const path = require('path');

const googleServicesPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');
const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));

const projectId = googleServices.project_info.project_id;
const apiKey = googleServices.client?.[0]?.api_key?.[0]?.current_key;
const configuredStorageBucket = googleServices.project_info.storage_bucket;
const candidateBuckets = Array.from(new Set([
  configuredStorageBucket,
  `${projectId}.appspot.com`,
].filter(Boolean)));

if (!projectId || !apiKey || !configuredStorageBucket) {
  console.error('Missing Firebase project configuration.');
  process.exit(1);
}

const localImagePath = path.join(__dirname, '..', 'assets', 'Kiran_App.png');
const imageBuffer = fs.readFileSync(localImagePath);
const runId = `sample_image_${Date.now()}`;
const documentId = `sample_${Date.now()}`;
const fileName = `Kiran_${runId}.png`;
const storagePath = `kiran-drive/images/${documentId}/${fileName}`;

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }

  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
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

async function uploadToStorage(idToken) {
  const attempts = [];

  for (const bucket of candidateBuckets) {
    const uploadUrls = [
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(storagePath)}`,
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`,
    ];

    for (const uploadUrl of uploadUrls) {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Firebase ${idToken}`,
          'Content-Type': 'image/png',
        },
        body: imageBuffer,
      });

      if (response.ok) {
        const data = await response.json();
        const downloadToken = typeof data.downloadTokens === 'string'
          ? data.downloadTokens.split(',')[0]
          : '';
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media${downloadToken ? `&token=${downloadToken}` : ''}`;

        return {
          bucket,
          uploadUrl,
          uploadResponse: data,
          downloadUrl,
        };
      }

      attempts.push({
        bucket,
        uploadUrl,
        status: response.status,
        body: await response.text(),
      });
    }
  }

  throw new Error(`Storage upload failed: ${JSON.stringify(attempts, null, 2)}`);
}

async function createFirestoreDoc(idToken, collectionName, payload) {
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
    throw new Error(`Firestore create failed for ${collectionName}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  const auth = await signInAnonymously();
  const { idToken, localId } = auth;
  const now = new Date().toISOString();
  const storageResult = await uploadToStorage(idToken);

  const payload = {
    folderId: null,
    fileName,
    fileType: 'image/png',
    originalFileSize: imageBuffer.length,
    compressedFileSize: imageBuffer.length,
    fileUrl: storageResult.downloadUrl,
    thumbnailUrl: storageResult.downloadUrl,
    storagePath,
    textContent: '',
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };

  await createFirestoreDoc(idToken, 'files', payload);
  await createFirestoreDoc(idToken, 'images', payload);

  console.log(JSON.stringify({
    ok: true,
    projectId,
    configuredStorageBucket,
    usedBucket: storageResult.bucket,
    uploadUrl: storageResult.uploadUrl,
    authUid: localId,
    documentId,
    fileName,
    storagePath,
    fileUrl: storageResult.downloadUrl,
    fileSize: imageBuffer.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
