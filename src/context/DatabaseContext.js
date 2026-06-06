import React, { createContext, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import { firebaseService } from '../services/firebaseService';
import { encryptPassword, decryptPassword } from '../services/cryptoHelper';
import { taskService } from '../services/taskService';
import { notificationService } from '../services/notificationService';

export const DatabaseContext = createContext();

const CACHE_KEY_BY_TYPE = {
  folders: Config.STORAGE_KEYS.OFFLINE_FOLDERS,
  files: Config.STORAGE_KEYS.OFFLINE_FILES,
  links: Config.STORAGE_KEYS.OFFLINE_LINKS,
  passwords: Config.STORAGE_KEYS.OFFLINE_PASSWORDS,
  tasks: Config.STORAGE_KEYS.OFFLINE_TASKS,
};

function isSeededLocalItem(item) {
  return typeof item?._id === 'string' && item._id.startsWith('local_');
}

function sanitizeCollection(items = []) {
  return items.filter(item => !isSeededLocalItem(item));
}

function sanitizeCollections(collections = {}) {
  return {
    folders: sanitizeCollection(collections.folders),
    files: sanitizeCollection(collections.files),
    links: sanitizeCollection(collections.links),
    passwords: sanitizeCollection(collections.passwords),
    tasks: sanitizeCollection(collections.tasks),
  };
}

function makeSyncTask(type, action, itemId, data = null) {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    action,
    itemId,
    data,
    timestamp: new Date().toISOString(),
  };
}

function getEmptyCollections() {
  return {
    folders: [],
    files: [],
    links: [],
    passwords: [],
    tasks: [],
  };
}

function mergeRemoteWithCached(remoteItems = [], cachedItems = []) {
  const remoteIds = new Set(remoteItems.map(item => item._id));
  const missingCachedItems = cachedItems.filter(item => !remoteIds.has(item._id));
  return [...missingCachedItems, ...remoteItems];
}

function upsertCollectionItem(items, nextItem) {
  const existingIndex = items.findIndex(item => item._id === nextItem._id);
  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  const updated = [...items];
  updated[existingIndex] = {
    ...updated[existingIndex],
    ...nextItem,
  };
  return updated;
}

function markFolderBranchDeleted(collections, folderId, deleted, permanent, timestamp) {
  const childFolderIds = collections.folders
    .filter(folder => folder.parentFolderId === folderId)
    .map(folder => folder._id);

  if (permanent) {
    collections.folders = collections.folders.filter(folder => folder._id !== folderId);
    collections.files = collections.files.filter(file => file.folderId !== folderId);
    collections.links = collections.links.filter(link => link.folderId !== folderId);
    collections.passwords = collections.passwords.filter(password => password.folderId !== folderId);
  } else {
    collections.folders = collections.folders.map(folder => (
      folder._id === folderId
        ? { ...folder, deleted, updatedAt: timestamp }
        : folder
    ));
    collections.files = collections.files.map(file => (
      file.folderId === folderId
        ? { ...file, deleted, updatedAt: timestamp }
        : file
    ));
    collections.links = collections.links.map(link => (
      link.folderId === folderId
        ? { ...link, deleted, updatedAt: timestamp }
        : link
    ));
    collections.passwords = collections.passwords.map(password => (
      password.folderId === folderId
        ? { ...password, deleted, updatedAt: timestamp }
        : password
    ));
  }

  childFolderIds.forEach(childFolderId => {
    markFolderBranchDeleted(collections, childFolderId, deleted, permanent, timestamp);
  });
}

function applyPendingQueueToCollections(baseCollections, queue = []) {
  const collections = {
    folders: [...baseCollections.folders],
    files: [...baseCollections.files],
    links: [...baseCollections.links],
    passwords: [...baseCollections.passwords],
    tasks: [...baseCollections.tasks],
  };

  queue.forEach((task) => {
    const { type, action, itemId, data, timestamp } = task;
    const collectionName = type;
    const taskTime = timestamp || new Date().toISOString();

    if (action === 'create' && collectionName) {
      const nextItem = {
        _id: itemId,
        ...data,
        createdAt: data?.createdAt || taskTime,
        updatedAt: taskTime,
        deleted: data?.deleted || false,
      };
      collections[collectionName] = upsertCollectionItem(collections[collectionName], nextItem);
      return;
    }

    if (action === 'update' && collectionName) {
      collections[collectionName] = collections[collectionName].map(item => (
        item._id === itemId
          ? { ...item, ...data, updatedAt: taskTime }
          : item
      ));
      return;
    }

    if (action === 'delete') {
      if (collectionName === Config.COLLECTIONS.FOLDERS) {
        markFolderBranchDeleted(collections, itemId, true, false, taskTime);
      } else if (collectionName) {
        collections[collectionName] = collections[collectionName].map(item => (
          item._id === itemId
            ? { ...item, deleted: true, updatedAt: taskTime }
            : item
        ));
      }
      return;
    }

    if (action === 'permanent_delete') {
      if (collectionName === Config.COLLECTIONS.FOLDERS) {
        markFolderBranchDeleted(collections, itemId, true, true, taskTime);
      } else if (collectionName) {
        collections[collectionName] = collections[collectionName].filter(item => item._id !== itemId);
      }
    }
  });

  return collections;
}

export const DatabaseProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collectionHealth, setCollectionHealth] = useState({});
  const [syncQueue, setSyncQueue] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [passwords, setPasswords] = useState([]);
  const [tasks, setTasks] = useState([]);

  const saveOfflineCacheDirectly = useCallback(async (type, updatedCollection) => {
    const key = CACHE_KEY_BY_TYPE[type];

    if (type === Config.COLLECTIONS.FOLDERS) {
      setFolders(updatedCollection);
    } else if (type === Config.COLLECTIONS.FILES) {
      setFiles(updatedCollection);
    } else if (type === Config.COLLECTIONS.LINKS) {
      setLinks(updatedCollection);
    } else if (type === Config.COLLECTIONS.PASSWORDS) {
      setPasswords(updatedCollection);
    } else if (type === Config.COLLECTIONS.TASKS) {
      setTasks(updatedCollection);
    }

    if (key) {
      let serialized = updatedCollection;
      if (type === Config.COLLECTIONS.PASSWORDS) {
        serialized = updatedCollection.map(p => ({
          ...p,
          password: encryptPassword(p.password)
        }));
      }
      await AsyncStorage.setItem(key, JSON.stringify(serialized));
    }
  }, []);

  const loadOfflineCache = useCallback(async () => {
    try {
      const [cacheFolders, cacheFiles, cacheLinks, cachePasswords, cacheTasks] = await Promise.all([
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_FOLDERS),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_FILES),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_LINKS),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_PASSWORDS),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_TASKS),
      ]);

      const sanitized = sanitizeCollections({
        folders: cacheFolders ? JSON.parse(cacheFolders) : [],
        files: cacheFiles ? JSON.parse(cacheFiles) : [],
        links: cacheLinks ? JSON.parse(cacheLinks) : [],
        passwords: cachePasswords ? JSON.parse(cachePasswords) : [],
        tasks: cacheTasks ? JSON.parse(cacheTasks) : [],
      });

      const decryptedPasswords = sanitized.passwords.map(p => ({
        ...p,
        password: decryptPassword(p.password)
      }));

      setFolders(sanitized.folders);
      setFiles(sanitized.files);
      setLinks(sanitized.links);
      setPasswords(decryptedPasswords);
      setTasks(sanitized.tasks);
    } catch (error) {
      console.error('Offline cache loading failed:', error);
    }
  }, []);

  const getOfflineCacheSnapshot = useCallback(async () => {
    try {
      const [cacheFolders, cacheFiles, cacheLinks, cachePasswords, cacheTasks] = await Promise.all([
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_FOLDERS),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_FILES),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_LINKS),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_PASSWORDS),
        AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_TASKS),
      ]);

      const sanitized = sanitizeCollections({
        folders: cacheFolders ? JSON.parse(cacheFolders) : [],
        files: cacheFiles ? JSON.parse(cacheFiles) : [],
        links: cacheLinks ? JSON.parse(cacheLinks) : [],
        passwords: cachePasswords ? JSON.parse(cachePasswords) : [],
        tasks: cacheTasks ? JSON.parse(cacheTasks) : [],
      });

      sanitized.passwords = sanitized.passwords.map(p => ({
        ...p,
        password: decryptPassword(p.password)
      }));

      return sanitized;
    } catch (error) {
      console.error('Offline cache snapshot failed:', error);
      return getEmptyCollections();
    }
  }, []);

  const persistSyncQueue = useCallback(async (queue) => {
    setSyncQueue(queue);
    await AsyncStorage.setItem(Config.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const result = await firebaseService.testConnection();
      setCollectionHealth(result.collections || {});
      const online = Boolean(result.ok);
      setIsConnected(online);
      return online;
    } catch (error) {
      console.log(`Firebase connection unavailable. Running offline: ${error.message}`);
      setCollectionHealth({});
      setIsConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        await checkConnection();
      } catch (error) {
        console.error('Failed to load Firebase config:', error);
      }
    };

    const loadQueue = async () => {
      try {
        const savedQueue = await AsyncStorage.getItem(Config.STORAGE_KEYS.SYNC_QUEUE);
        if (savedQueue) {
          setSyncQueue(JSON.parse(savedQueue));
        }
      } catch (error) {
        console.error('Failed to load sync queue:', error);
      }
    };

    loadConfig();
    loadQueue();
  }, [checkConnection]);

  const enqueueSyncTask = useCallback(async (type, action, itemId, data = null) => {
    try {
      const savedQueue = await AsyncStorage.getItem(Config.STORAGE_KEYS.SYNC_QUEUE);
      const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
      const updatedQueue = [...currentQueue, makeSyncTask(type, action, itemId, data)];
      await persistSyncQueue(updatedQueue);
      console.log(`Enqueued sync task: ${action} on ${type} with ID ${itemId}`);
    } catch (error) {
      console.error('Failed to enqueue sync task:', error);
    }
  }, [persistSyncQueue]);

  const processSyncQueue = useCallback(async (currentQueue = syncQueue) => {
    if (currentQueue.length === 0) {
      console.log('[SyncQueue] No pending tasks to process.');
      return;
    }

    console.log(`[SyncQueue] Starting processing for ${currentQueue.length} task(s).`);
    const activeOnline = await checkConnection();
    if (!activeOnline) {
      console.log('Sync queue processing skipped: offline.');
      return;
    }

    const idMap = {};
    const remainingQueue = [...currentQueue];

    while (remainingQueue.length > 0) {
      const task = remainingQueue[0];
      const { type, action, itemId, data } = task;
      const translatedItemId = idMap[itemId] || itemId;

      try {
        console.log(`[SyncQueue] Processing ${action} for ${type}/${translatedItemId}.`, {
          originalItemId: itemId,
          payload: data,
        });
        if (action === 'create') {
          const translatedData = { ...data };

          if (translatedData.folderId && idMap[translatedData.folderId]) {
            translatedData.folderId = idMap[translatedData.folderId];
          }
          if (translatedData.parentFolderId && idMap[translatedData.parentFolderId]) {
            translatedData.parentFolderId = idMap[translatedData.parentFolderId];
          }

          const savedItem = await firebaseService.insertItem(type, translatedData);
          if (savedItem?._id) {
            idMap[itemId] = savedItem._id;
          }
        } else if (action === 'update') {
          if (!translatedItemId.startsWith('local_')) {
            const translatedFields = { ...data };
            if (translatedFields.folderId && idMap[translatedFields.folderId]) {
              translatedFields.folderId = idMap[translatedFields.folderId];
            }
            if (translatedFields.parentFolderId && idMap[translatedFields.parentFolderId]) {
              translatedFields.parentFolderId = idMap[translatedFields.parentFolderId];
            }

            await firebaseService.updateItem(type, translatedItemId, translatedFields);
          }
        } else if (action === 'delete') {
          if (!translatedItemId.startsWith('local_')) {
            if (type === Config.COLLECTIONS.FOLDERS) {
              await firebaseService.deleteFolderTree(translatedItemId, false);
            } else {
              await firebaseService.deleteItem(type, translatedItemId, false);
            }
          }
        } else if (action === 'permanent_delete') {
          if (!translatedItemId.startsWith('local_')) {
            if (type === Config.COLLECTIONS.FOLDERS) {
              await firebaseService.deleteFolderTree(translatedItemId, true);
            } else {
              await firebaseService.deleteItem(type, translatedItemId, true);
            }
          }
        } else if (action === 'copy') {
          const translatedParentId = data?.targetParentId && idMap[data.targetParentId]
            ? idMap[data.targetParentId]
            : data?.targetParentId || null;

          if (!translatedItemId.startsWith('local_')) {
            await firebaseService.copyFolderTree(translatedItemId, translatedParentId);
          }
        }

        remainingQueue.shift();
        await persistSyncQueue(remainingQueue);
        console.log(`[SyncQueue] Completed ${action} for ${type}/${translatedItemId}. Remaining: ${remainingQueue.length}`);
      } catch (error) {
        console.error('Sync queue execution failed at task:', task.id, error.message);
        break;
      }
    }
  }, [checkConnection, persistSyncQueue, syncQueue]);

  const refreshData = useCallback(async () => {
    setLoading(true);

    try {
      const activeOnline = await checkConnection();

      if (activeOnline) {
        const savedQueue = await AsyncStorage.getItem(Config.STORAGE_KEYS.SYNC_QUEUE);
        const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
        console.log(`[DatabaseContext] Refresh started. Pending sync queue length: ${currentQueue.length}`);

        if (currentQueue.length > 0) {
          await processSyncQueue(currentQueue);
        }

        const latestQueueRaw = await AsyncStorage.getItem(Config.STORAGE_KEYS.SYNC_QUEUE);
        const latestQueue = latestQueueRaw ? JSON.parse(latestQueueRaw) : [];
        const cachedCollections = await getOfflineCacheSnapshot();
        const collectionKeys = [
          Config.COLLECTIONS.FOLDERS,
          Config.COLLECTIONS.FILES,
          Config.COLLECTIONS.LINKS,
          Config.COLLECTIONS.PASSWORDS,
          Config.COLLECTIONS.TASKS,
        ];

        const settledCollections = await Promise.allSettled(
          collectionKeys.map(collectionName => firebaseService.getCollection(collectionName))
        );

        const nextCollectionHealth = {};
        const remoteCollections = {
          folders: cachedCollections.folders,
          files: cachedCollections.files,
          links: cachedCollections.links,
          passwords: cachedCollections.passwords,
          tasks: cachedCollections.tasks,
        };

        settledCollections.forEach((result, index) => {
          const collectionName = collectionKeys[index];
          if (result.status === 'fulfilled') {
            remoteCollections[collectionName] = mergeRemoteWithCached(result.value, cachedCollections[collectionName]);
            nextCollectionHealth[collectionName] = {
              ok: true,
              count: result.value.length,
            };
          } else {
            nextCollectionHealth[collectionName] = {
              ok: false,
              errorMessage: result.reason?.message || 'Unknown collection refresh error',
              errorCode: result.reason?.code || null,
            };
            console.error(`[DatabaseContext] Remote refresh failed for ${collectionName}. Using cached data instead.`, result.reason?.message || result.reason);
          }
        });

        setCollectionHealth(nextCollectionHealth);

        const mergedCollections = applyPendingQueueToCollections(remoteCollections, latestQueue);

        await Promise.all([
          saveOfflineCacheDirectly(Config.COLLECTIONS.FOLDERS, mergedCollections.folders),
          saveOfflineCacheDirectly(Config.COLLECTIONS.FILES, mergedCollections.files),
          saveOfflineCacheDirectly(Config.COLLECTIONS.LINKS, mergedCollections.links),
          saveOfflineCacheDirectly(Config.COLLECTIONS.PASSWORDS, mergedCollections.passwords),
          saveOfflineCacheDirectly(Config.COLLECTIONS.TASKS, mergedCollections.tasks),
        ]);
      } else {
        await loadOfflineCache();
      }
    } catch (error) {
      console.error('Firebase sync error. Loading offline cache:', error.message);
      await loadOfflineCache();
    } finally {
      setLoading(false);
    }
  }, [checkConnection, getOfflineCacheSnapshot, loadOfflineCache, processSyncQueue, saveOfflineCacheDirectly]);

  const clearAllData = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([
        AsyncStorage.removeItem(Config.STORAGE_KEYS.OFFLINE_FOLDERS),
        AsyncStorage.removeItem(Config.STORAGE_KEYS.OFFLINE_FILES),
        AsyncStorage.removeItem(Config.STORAGE_KEYS.OFFLINE_LINKS),
        AsyncStorage.removeItem(Config.STORAGE_KEYS.OFFLINE_PASSWORDS),
        AsyncStorage.removeItem(Config.STORAGE_KEYS.OFFLINE_TASKS),
        AsyncStorage.removeItem(Config.STORAGE_KEYS.SYNC_QUEUE),
      ]);

      setFolders([]);
      setFiles([]);
      setLinks([]);
      setPasswords([]);
      setTasks([]);
      setSyncQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const removeLegacySeedArtifacts = async () => {
      try {
        const cachedCollections = await getOfflineCacheSnapshot();
        const sanitized = sanitizeCollections(cachedCollections);

        const changed = (
          sanitized.folders.length !== cachedCollections.folders.length ||
          sanitized.files.length !== cachedCollections.files.length ||
          sanitized.links.length !== cachedCollections.links.length ||
          sanitized.passwords.length !== cachedCollections.passwords.length ||
          sanitized.tasks.length !== cachedCollections.tasks.length
        );

        if (changed) {
          await Promise.all([
            saveOfflineCacheDirectly(Config.COLLECTIONS.FOLDERS, sanitized.folders),
            saveOfflineCacheDirectly(Config.COLLECTIONS.FILES, sanitized.files),
            saveOfflineCacheDirectly(Config.COLLECTIONS.LINKS, sanitized.links),
            saveOfflineCacheDirectly(Config.COLLECTIONS.PASSWORDS, sanitized.passwords),
            saveOfflineCacheDirectly(Config.COLLECTIONS.TASKS, sanitized.tasks),
          ]);
        }
      } catch (error) {
        console.error('Legacy seed cleanup failed:', error.message);
      }
    };

    removeLegacySeedArtifacts();
  }, [getOfflineCacheSnapshot, saveOfflineCacheDirectly]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Request notifications permission on startup
  useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  // Check for overdue tasks
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const todayStr = Config.getLocalDateString();
      const overdueTasks = tasks.filter(task => 
        task.dueDate && 
        task.status !== 'Completed' && 
        task.status !== 'Overdue' && 
        !task.deleted &&
        task.dueDate < todayStr
      );

      if (overdueTasks.length > 0) {
        console.log(`[Overdue Check] Found ${overdueTasks.length} overdue tasks. Updating status to Overdue...`);
        
        const runUpdates = async () => {
          const dbContextMock = {
            isConnected,
            checkConnection,
            loading,
            folders,
            files,
            links,
            passwords,
            tasks,
            refreshData,
            collectionHealth,
            saveOfflineCacheDirectly,
            clearAllData,
            enqueueSyncTask,
            syncQueue,
          };
          
          for (const task of overdueTasks) {
            try {
              await taskService.updateTask(task._id, { status: 'Overdue' }, dbContextMock);
              await notificationService.showImmediateOverdueNotification(task);
            } catch (err) {
              console.error(`Failed to update overdue task ${task._id}:`, err);
            }
          }
          refreshData();
        };

        runUpdates();
      }
    }
  }, [tasks, isConnected, folders, files, links, passwords, refreshData, saveOfflineCacheDirectly, enqueueSyncTask, syncQueue]);

  return (
    <DatabaseContext.Provider
      value={{
        isConnected,
        checkConnection,
        loading,
        folders,
        files,
        links,
        passwords,
        tasks,
        refreshData,
        collectionHealth,
        saveOfflineCacheDirectly,
        clearAllData,
        enqueueSyncTask,
        syncQueue,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};
