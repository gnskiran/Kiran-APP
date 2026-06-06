import app, { getApp, getApps } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';
import { Config } from '../constants/Config';
import { encryptPassword, decryptPassword } from './cryptoHelper';

function convertFirestoreValue(value) {
  if (Array.isArray(value)) {
    return value.map(convertFirestoreValue);
  }

  if (value && typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value && typeof value === 'object') {
    const next = {};
    Object.entries(value).forEach(([key, child]) => {
      next[key] = convertFirestoreValue(child);
    });
    return next;
  }

  return value;
}

function normalizeDoc(doc) {
  return {
    _id: doc.id,
    ...convertFirestoreValue(doc.data()),
  };
}

function normalizeUploadUri(uri) {
  if (!uri) return uri;
  if (Platform.OS === 'android' && uri.startsWith('file://')) {
    return uri.replace('file://', '');
  }
  return uri;
}

function isLocalDeviceFile(uri) {
  return typeof uri === 'string' && uri.startsWith('file://');
}

function isRemoteFile(uri) {
  return typeof uri === 'string' && /^https?:\/\//i.test(uri);
}

function getStorageCategory(fileType) {
  if (typeof fileType === 'string' && fileType.startsWith('image/')) {
    return 'images';
  }

  if (fileType === 'application/pdf') {
    return 'pdfs';
  }

  return 'documents';
}

function getMirroredCollectionNames(fileType) {
  const collections = [];

  if (typeof fileType === 'string' && fileType.startsWith('image/')) {
    collections.push(Config.COLLECTIONS.IMAGES);
  }

  if (fileType === 'application/pdf') {
    collections.push(Config.COLLECTIONS.PDFS);
  }

  return collections;
}

let signInPromise = null;
let authStateReadyPromise = null;

function formatFirebaseError(error) {
  return {
    errorCode: error?.code || null,
    errorMessage: error?.message || 'Unknown Firebase error',
    nativeErrorCode: error?.nativeErrorCode || null,
    nativeErrorMessage: error?.nativeErrorMessage || null,
  };
}

function getFirebaseAppInstance() {
  try {
    if (typeof getApps === 'function') {
      const apps = getApps();
      if (Array.isArray(apps) && apps.length > 0) {
        return getApp();
      }
    }
  } catch (error) {
    // Fall back to the namespaced API below.
  }

  try {
    if (app && typeof app.app === 'function') {
      return app.app();
    }
  } catch (error) {
    // Fall back to the default exported callable below.
  }

  try {
    if (typeof app === 'function') {
      return app();
    }
  } catch (error) {
    return null;
  }

  return null;
}

function getFirebaseAppOptions() {
  const firebaseApp = getFirebaseAppInstance();
  return firebaseApp?.options || {};
}

function getFirebaseRuntimeSummary() {
  const options = getFirebaseAppOptions();

  return {
    projectId: options.projectId || null,
    storageBucket: options.storageBucket || null,
    packageName: options.androidPackageName || Config.FIREBASE_ANDROID_PACKAGE,
    appId: options.appId || null,
  };
}

function ensureFirebaseNativeConfig() {
  const firebaseApp = getFirebaseAppInstance();
  if (!firebaseApp) {
    throw new Error(
      'Firebase default app is unavailable. ' +
      'Verify android/app/google-services.json is present and rebuild the app.'
    );
  }

  const options = getFirebaseAppOptions();
  const missingKeys = [];

  if (!options.projectId) missingKeys.push('projectId');
  if (!options.appId) missingKeys.push('appId');
  if (!options.apiKey) missingKeys.push('apiKey');
  if (!options.storageBucket) missingKeys.push('storageBucket');

  if (missingKeys.length > 0) {
    logFirebaseDiagnostics('Firebase app options missing expected fields, continuing with native app instance', {
      missingKeys,
      appName: firebaseApp?.name || null,
    });
  }

  return options;
}

function logFirebaseDiagnostics(message, extra = {}) {
  try {
    const currentUser = auth().currentUser;
    const runtime = getFirebaseRuntimeSummary();
    console.log(`[FirebaseDiag] ${message}: ${JSON.stringify({
      projectId: runtime.projectId,
      storageBucket: runtime.storageBucket,
      packageName: runtime.packageName,
      appId: runtime.appId,
      authUid: currentUser?.uid || null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      ...extra,
    })}`);
  } catch (error) {
    console.log(`[FirebaseDiag] ${message}: ${JSON.stringify({
      loggerError: error.message,
      ...extra,
    })}`);
  }
}

function logFirestoreRequest(operation, collectionName, payload = null, extra = {}) {
  logFirebaseDiagnostics(`Firestore ${operation}`, {
    authState: auth().currentUser ? 'signed_in' : 'signed_out',
    collectionName,
    requestPayload: payload,
    ...extra,
  });
}

function waitForAuthInitialization() {
  if (!authStateReadyPromise) {
    authStateReadyPromise = new Promise((resolve) => {
      const subscription = { current: null };
      subscription.current = auth().onAuthStateChanged((user) => {
        logFirebaseDiagnostics('Auth state changed', {
          authState: user ? 'signed_in' : 'signed_out',
        });
        if (typeof subscription.current === 'function') {
          subscription.current();
          subscription.current = null;
        }
        resolve(user);
      });
    });
  }

  return authStateReadyPromise;
}

async function ensureSignedIn() {
  ensureFirebaseNativeConfig();
  await waitForAuthInitialization();

  if (auth().currentUser) {
    await auth().currentUser.getIdToken(true);
    logFirebaseDiagnostics('Using existing authenticated user');
    return auth().currentUser;
  }

  if (!signInPromise) {
    logFirebaseDiagnostics('Signing in anonymously');
    signInPromise = auth()
      .signInAnonymously()
      .finally(() => {
        signInPromise = null;
      });
  }

  await signInPromise;

  if (auth().currentUser) {
    await auth().currentUser.getIdToken(true);
  }

  logFirebaseDiagnostics('Anonymous sign-in completed');
  return auth().currentUser;
}

async function uploadFileIfNeeded(itemBody, docId) {
  if (itemBody.fileType === 'text/plain' && !isLocalDeviceFile(itemBody.fileUrl) && !isRemoteFile(itemBody.fileUrl)) {
    return {
      ...itemBody,
      textContent: itemBody.fileUrl || '',
      fileUrl: '',
      thumbnailUrl: '',
      storagePath: '',
    };
  }

  if (!isLocalDeviceFile(itemBody.fileUrl)) {
    return itemBody;
  }

  const sanitizedName = (itemBody.fileName || `file_${docId}`).replace(/[^\w.\-]+/g, '_');
  const storageCategory = getStorageCategory(itemBody.fileType);
  const remotePath = `${Config.FIREBASE_STORAGE_ROOT}/${storageCategory}/${docId}/${sanitizedName}`;
  const fileRef = storage().ref(remotePath);

  try {
    await fileRef.putFile(normalizeUploadUri(itemBody.fileUrl));
    const downloadUrl = await fileRef.getDownloadURL();

    return {
      ...itemBody,
      fileUrl: downloadUrl,
      thumbnailUrl: itemBody.fileType?.startsWith('image/') ? downloadUrl : itemBody.thumbnailUrl || '',
      storagePath: remotePath,
    };
  } catch (error) {
    logFirebaseDiagnostics('Storage upload failed', {
      documentId: docId,
      fileName: itemBody.fileName || null,
      fileType: itemBody.fileType || null,
      localUri: itemBody.fileUrl || null,
      remotePath,
      errorCode: error?.code || null,
      errorMessage: error?.message || 'Unknown storage upload error',
    });

    throw new Error(
      `Firebase Storage upload failed for "${itemBody.fileName || 'file'}". ` +
      `Check Storage rules, bucket configuration, and authentication. ` +
      `${error?.message || ''}`.trim()
    );
  }
}

async function deleteStorageObjectIfAny(fileDoc) {
  if (!fileDoc?.storagePath) {
    return;
  }

  try {
    const snapshot = await firestore()
      .collection(Config.COLLECTIONS.FILES)
      .where('storagePath', '==', fileDoc.storagePath)
      .get();

    const remainingReferences = snapshot.docs.filter(doc => doc.id !== fileDoc._id);
    if (remainingReferences.length > 0) {
      return;
    }

    await storage().ref(fileDoc.storagePath).delete();
  } catch (error) {
    console.log('Storage delete skipped:', error.message);
  }
}

async function getAllCollections() {
  const [folders, files, links, passwords] = await Promise.all([
    firebaseService.getCollection(Config.COLLECTIONS.FOLDERS),
    firebaseService.getCollection(Config.COLLECTIONS.FILES),
    firebaseService.getCollection(Config.COLLECTIONS.LINKS),
    firebaseService.getCollection(Config.COLLECTIONS.PASSWORDS),
  ]);

  return { folders, files, links, passwords };
}

async function setMirroredFileRecords(docId, payload) {
  const mirrorCollections = getMirroredCollectionNames(payload.fileType);

  await Promise.all(mirrorCollections.map(collectionName => (
    firestore().collection(collectionName).doc(docId).set(payload)
  )));
}

function stripDocumentId(payload) {
  if (!payload) {
    return payload;
  }

  const { _id, ...rest } = payload;
  return rest;
}

async function deleteMirroredFileRecords(docId, fileType) {
  const mirrorCollections = getMirroredCollectionNames(fileType);

  await Promise.all(mirrorCollections.map(async (collectionName) => {
    try {
      await firestore().collection(collectionName).doc(docId).delete();
    } catch (error) {
      console.log(`Mirrored delete skipped for ${collectionName}/${docId}:`, error.message);
    }
  }));
}

async function syncMirroredFileRecords(docId, previousPayload, nextPayload) {
  const previousCollections = getMirroredCollectionNames(previousPayload?.fileType);
  const nextCollections = getMirroredCollectionNames(nextPayload?.fileType);

  const collectionsToDelete = previousCollections.filter(name => !nextCollections.includes(name));
  const collectionsToUpsert = nextCollections;

  await Promise.all(collectionsToDelete.map(async (collectionName) => {
    try {
      await firestore().collection(collectionName).doc(docId).delete();
    } catch (error) {
      console.log(`Mirror membership cleanup skipped for ${collectionName}/${docId}:`, error.message);
    }
  }));

  await Promise.all(collectionsToUpsert.map(collectionName => (
    firestore().collection(collectionName).doc(docId).set(nextPayload)
  )));
}

export const firebaseService = {
  async testConnection() {
    ensureFirebaseNativeConfig();
    const user = await ensureSignedIn();
    const collections = [
      Config.COLLECTIONS.FOLDERS,
      Config.COLLECTIONS.FILES,
      Config.COLLECTIONS.LINKS,
      Config.COLLECTIONS.PASSWORDS,
      Config.COLLECTIONS.TASKS,
    ];

    const results = await Promise.allSettled(
      collections.map(async (collectionName) => {
        logFirestoreRequest('read', collectionName, null, {
          query: 'limit(1)',
          diagnosticProbe: true,
        });
        const snapshot = await firestore().collection(collectionName).limit(1).get();
        return { collectionName, count: snapshot.size };
      })
    );

    const summary = results.reduce((acc, result, index) => {
      const collectionName = collections[index];
      if (result.status === 'fulfilled') {
        acc[collectionName] = {
          ok: true,
          count: result.value.count,
        };
      } else {
        acc[collectionName] = {
          ok: false,
          ...formatFirebaseError(result.reason),
        };
      }
      return acc;
    }, {});

    logFirebaseDiagnostics('Firestore connection test completed', {
      authUid: user?.uid || null,
      collectionSummary: summary,
    });

    return {
      ok: Object.values(summary).some(result => result.ok),
      authUid: user?.uid || null,
      projectId: getFirebaseRuntimeSummary().projectId,
      collections: summary,
    };
  },

  async getCollection(type) {
    await ensureSignedIn();
    logFirestoreRequest('read', type);
    try {
      const snapshot = await firestore().collection(type).get();
      const docs = snapshot.docs.map(normalizeDoc);
      logFirebaseDiagnostics('Firestore read succeeded', {
        collectionName: type,
        resultCount: docs.length,
      });
      if (type === Config.COLLECTIONS.PASSWORDS) {
        return docs.map(p => ({
          ...p,
          password: decryptPassword(p.password)
        }));
      }
      return docs;
    } catch (error) {
      logFirebaseDiagnostics('Firestore read failed', {
        collectionName: type,
        ...formatFirebaseError(error),
      });
      throw error;
    }
  },

  async insertItem(type, itemBody) {
    await ensureSignedIn();
    const collectionRef = firestore().collection(type);
    const docRef = collectionRef.doc();
    const now = new Date().toISOString();

    let payload = {
      ...itemBody,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    if (type === Config.COLLECTIONS.PASSWORDS) {
      payload.password = encryptPassword(payload.password);
    }

    if (type === Config.COLLECTIONS.FILES) {
      payload = await uploadFileIfNeeded(payload, docRef.id);
    }

    logFirestoreRequest('create', type, payload, {
      documentId: docRef.id,
    });
    try {
      await docRef.set(payload);

      if (type === Config.COLLECTIONS.FILES) {
        await setMirroredFileRecords(docRef.id, payload);
      }

      logFirebaseDiagnostics('Firestore create succeeded', {
        collectionName: type,
        documentId: docRef.id,
      });

      const returnVal = { _id: docRef.id, ...payload };
      if (type === Config.COLLECTIONS.PASSWORDS) {
        returnVal.password = decryptPassword(returnVal.password);
      }
      return returnVal;
    } catch (error) {
      logFirebaseDiagnostics('Firestore create failed', {
        collectionName: type,
        documentId: docRef.id,
        requestPayload: payload,
        ...formatFirebaseError(error),
      });
      throw error;
    }
  },

  async updateItem(type, id, updatedFields) {
    await ensureSignedIn();
    const docRef = firestore().collection(type).doc(id);
    const existingSnapshot = type === Config.COLLECTIONS.FILES ? await docRef.get() : null;
    const existingPayload = existingSnapshot?.exists ? normalizeDoc(existingSnapshot) : null;
    const nextFields = {
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    if (type === Config.COLLECTIONS.PASSWORDS && nextFields.password) {
      nextFields.password = encryptPassword(nextFields.password);
    }

    logFirestoreRequest('update', type, nextFields, {
      documentId: id,
    });
    try {
      await docRef.update(nextFields);
      const updated = await docRef.get();
      const normalized = normalizeDoc(updated);

      if (type === Config.COLLECTIONS.FILES) {
        await syncMirroredFileRecords(id, existingPayload, stripDocumentId(normalized));
      }

      if (type === Config.COLLECTIONS.PASSWORDS) {
        normalized.password = decryptPassword(normalized.password);
      }

      logFirebaseDiagnostics('Firestore update succeeded', {
        collectionName: type,
        documentId: id,
      });

      return normalized;
    } catch (error) {
      logFirebaseDiagnostics('Firestore update failed', {
        collectionName: type,
        documentId: id,
        requestPayload: nextFields,
        ...formatFirebaseError(error),
      });
      throw error;
    }
  },

  async deleteItem(type, id, permanent = false) {
    await ensureSignedIn();
    const docRef = firestore().collection(type).doc(id);

    if (permanent) {
      logFirestoreRequest('delete', type, null, {
        documentId: id,
        permanent: true,
      });
      if (type === Config.COLLECTIONS.FILES) {
        const snapshot = await docRef.get();
        if (snapshot.exists) {
          const normalized = normalizeDoc(snapshot);
          await deleteStorageObjectIfAny(normalized);
          await deleteMirroredFileRecords(id, normalized.fileType);
        }
      }

      try {
        await docRef.delete();
        logFirebaseDiagnostics('Firestore delete succeeded', {
          collectionName: type,
          documentId: id,
          permanent: true,
        });
        return { success: true, id };
      } catch (error) {
        logFirebaseDiagnostics('Firestore delete failed', {
          collectionName: type,
          documentId: id,
          permanent: true,
          ...formatFirebaseError(error),
        });
        throw error;
      }
    }

    logFirestoreRequest('update', type, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    }, {
      documentId: id,
      softDelete: true,
    });
    try {
      await docRef.update({
        deleted: true,
        updatedAt: new Date().toISOString(),
      });

      if (type === Config.COLLECTIONS.FILES) {
        const snapshot = await docRef.get();
        if (snapshot.exists) {
          const normalized = normalizeDoc(snapshot);
          await syncMirroredFileRecords(id, normalized, stripDocumentId(normalized));
        }
      }

      logFirebaseDiagnostics('Firestore soft delete succeeded', {
        collectionName: type,
        documentId: id,
      });

      return { success: true, id };
    } catch (error) {
      logFirebaseDiagnostics('Firestore soft delete failed', {
        collectionName: type,
        documentId: id,
        ...formatFirebaseError(error),
      });
      throw error;
    }
  },

  async copyFolderTree(folderId, targetParentId) {
    await ensureSignedIn();
    const { folders, files, links, passwords } = await getAllCollections();
    const folderIdMap = {};
    const now = new Date().toISOString();

    let initialParentPath = '';
    let initialParentName = null;
    if (targetParentId) {
      const breadcrumbs = [];
      let current = folders.find(f => f._id === targetParentId && !f.deleted);
      if (current) {
        initialParentName = current.folderName;
      }
      while (current) {
        breadcrumbs.unshift(current.folderName);
        const parentId = current.parentFolderId;
        if (!parentId) break;
        current = folders.find(f => f._id === parentId && !f.deleted);
      }
      initialParentPath = breadcrumbs.join('/');
    }

    const copyRecursive = async (sourceFolderId, newParentFolderId, isRoot, parentPath = '', parentName = null) => {
      const sourceFolder = folders.find(folder => folder._id === sourceFolderId && !folder.deleted);
      if (!sourceFolder) return null;

      const newFolderRef = firestore().collection(Config.COLLECTIONS.FOLDERS).doc();
      const folderName = isRoot ? `${sourceFolder.folderName} - Copy` : sourceFolder.folderName;
      const newFolderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

      await newFolderRef.set({
        folderName: folderName,
        parentFolderId: newParentFolderId || null,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      });
      folderIdMap[sourceFolderId] = newFolderRef.id;

      for (const file of files.filter(item => item.folderId === sourceFolderId && !item.deleted)) {
        const newFileRef = firestore().collection(Config.COLLECTIONS.FILES).doc();
        const dotIndex = file.fileName.lastIndexOf('.');
        const copiedName = dotIndex > 0
          ? `${file.fileName.slice(0, dotIndex)}_copy${file.fileName.slice(dotIndex)}`
          : `${file.fileName}_copy`;
        const { _id, ...fileData } = file;

        const mirroredPayload = {
          ...fileData,
          folderId: newFolderRef.id,
          fileName: copiedName,
          folderName: folderName,
          parentFolderName: parentName,
          folderPath: newFolderPath,
          createdAt: now,
          updatedAt: now,
          deleted: false,
        };

        await newFileRef.set(mirroredPayload);
        await setMirroredFileRecords(newFileRef.id, mirroredPayload);
      }

      for (const link of links.filter(item => item.folderId === sourceFolderId && !item.deleted)) {
        const newLinkRef = firestore().collection(Config.COLLECTIONS.LINKS).doc();
        const { _id, ...linkData } = link;
        await newLinkRef.set({
          ...linkData,
          folderId: newFolderRef.id,
          createdAt: now,
          updatedAt: now,
          deleted: false,
        });
      }

      for (const password of passwords.filter(item => item.folderId === sourceFolderId && !item.deleted)) {
        const newPasswordRef = firestore().collection(Config.COLLECTIONS.PASSWORDS).doc();
        const { _id, ...passwordData } = password;
        await newPasswordRef.set({
          ...passwordData,
          folderId: newFolderRef.id,
          createdAt: now,
          updatedAt: now,
          deleted: false,
        });
      }

      for (const childFolder of folders.filter(item => item.parentFolderId === sourceFolderId && !item.deleted)) {
        await copyRecursive(childFolder._id, newFolderRef.id, false, newFolderPath, folderName);
      }

      return newFolderRef.id;
    };

    const copiedRootId = await copyRecursive(
      folderId,
      targetParentId || null,
      true,
      targetParentId ? initialParentPath : '',
      targetParentId ? initialParentName : null
    );
    return { success: true, newFolderId: copiedRootId };
  },

  async deleteFolderTree(folderId, permanent = false) {
    await ensureSignedIn();
    const { folders, files, links, passwords } = await getAllCollections();
    const folderIds = [];
    const now = new Date().toISOString();

    const collectIds = (currentFolderId) => {
      folderIds.push(currentFolderId);
      folders
        .filter(folder => folder.parentFolderId === currentFolderId)
        .forEach(folder => collectIds(folder._id));
    };

    collectIds(folderId);

    if (permanent) {
      for (const file of files.filter(item => folderIds.includes(item.folderId))) {
        await deleteStorageObjectIfAny(file);
        await deleteMirroredFileRecords(file._id, file.fileType);
      }

      await Promise.all([
        ...folderIds.map(id => firestore().collection(Config.COLLECTIONS.FOLDERS).doc(id).delete()),
        ...files.filter(item => folderIds.includes(item.folderId)).map(item => firestore().collection(Config.COLLECTIONS.FILES).doc(item._id).delete()),
        ...links.filter(item => folderIds.includes(item.folderId)).map(item => firestore().collection(Config.COLLECTIONS.LINKS).doc(item._id).delete()),
        ...passwords.filter(item => folderIds.includes(item.folderId)).map(item => firestore().collection(Config.COLLECTIONS.PASSWORDS).doc(item._id).delete()),
      ]);

      return { success: true, id: folderId };
    }

    await Promise.all([
      ...folderIds.map(id => firestore().collection(Config.COLLECTIONS.FOLDERS).doc(id).update({ deleted: true, updatedAt: now })),
      ...files.filter(item => folderIds.includes(item.folderId)).map(item => firestore().collection(Config.COLLECTIONS.FILES).doc(item._id).update({ deleted: true, updatedAt: now })),
      ...links.filter(item => folderIds.includes(item.folderId)).map(item => firestore().collection(Config.COLLECTIONS.LINKS).doc(item._id).update({ deleted: true, updatedAt: now })),
      ...passwords.filter(item => folderIds.includes(item.folderId)).map(item => firestore().collection(Config.COLLECTIONS.PASSWORDS).doc(item._id).update({ deleted: true, updatedAt: now })),
    ]);

    await Promise.all(
      files
        .filter(item => folderIds.includes(item.folderId))
        .map(item => syncMirroredFileRecords(item._id, item, stripDocumentId({
          ...item,
          deleted: true,
          updatedAt: now,
        })))
    );

    return { success: true, id: folderId };
  },

};
