import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Config } from '../constants/Config';
import { firebaseService } from './firebaseService';
import { decryptPassword } from './cryptoHelper';

async function deletePhysicalFile(uri) {
  if (uri && uri.startsWith('file://')) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('Deleted physical file at:', uri);
      }
    } catch (error) {
      console.warn('Failed to delete physical file:', error.message);
    }
  }
}

function getCacheKey(type) {
  if (type === Config.COLLECTIONS.FOLDERS) return Config.STORAGE_KEYS.OFFLINE_FOLDERS;
  if (type === Config.COLLECTIONS.FILES) return Config.STORAGE_KEYS.OFFLINE_FILES;
  if (type === Config.COLLECTIONS.LINKS) return Config.STORAGE_KEYS.OFFLINE_LINKS;
  if (type === Config.COLLECTIONS.PASSWORDS) return Config.STORAGE_KEYS.OFFLINE_PASSWORDS;
  if (type === Config.COLLECTIONS.TASKS) return Config.STORAGE_KEYS.OFFLINE_TASKS;
}

export const storageService = {
  async getCollection(type, dbContext) {
    const { isConnected, saveOfflineCacheDirectly } = dbContext;

    if (isConnected) {
      try {
        const data = await firebaseService.getCollection(type);
        await saveOfflineCacheDirectly(type, data);
        return data;
      } catch (error) {
        console.error(`Cloud read failed for collection ${type}:`, {
          errorCode: error?.code || null,
          errorMessage: error?.message || 'Unknown read error',
        });
      }
    }

    const cachedData = await AsyncStorage.getItem(getCacheKey(type));
    const parsed = cachedData ? JSON.parse(cachedData) : [];
    if (type === Config.COLLECTIONS.PASSWORDS) {
      return parsed.map(p => ({ ...p, password: decryptPassword(p.password) }));
    }
    return parsed;
  },

  async insertItem(type, itemBody, dbContext) {
    const { isConnected, refreshData } = dbContext;
    const tempId = `local_${Math.random().toString(36).slice(2, 11)}`;

    const newItem = {
      _id: tempId,
      ...itemBody,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };

    if (isConnected) {
      try {
        const savedItem = await firebaseService.insertItem(type, itemBody);
        await refreshData();
        return savedItem;
      } catch (error) {
        console.error(`Cloud create failed for ${type}. Adding to offline cache.`, {
          itemBody,
          errorCode: error?.code || null,
          errorMessage: error?.message || 'Unknown create error',
        });

        if (type === Config.COLLECTIONS.FILES) {
          throw error;
        }
      }
    }

    if (dbContext.enqueueSyncTask) {
      await dbContext.enqueueSyncTask(type, 'create', tempId, itemBody);
    }

    const currentList = await this.getCollection(type, dbContext);
    const updatedList = [newItem, ...currentList];
    await dbContext.saveOfflineCacheDirectly(type, updatedList);
    return newItem;
  },

  async copyFolder(folderId, targetParentId, dbContext) {
    const { isConnected, refreshData } = dbContext;

    if (isConnected && !folderId.toString().startsWith('local_')) {
      try {
        const result = await firebaseService.copyFolderTree(folderId, targetParentId || null);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Cloud folder copy failed. Falling back to local copy.', error.message);
      }
    }

    if (dbContext.enqueueSyncTask) {
      await dbContext.enqueueSyncTask(Config.COLLECTIONS.FOLDERS, 'copy', folderId, { targetParentId });
    }

    const allFolders = await this.getCollection(Config.COLLECTIONS.FOLDERS, dbContext);
    const allFiles = await this.getCollection(Config.COLLECTIONS.FILES, dbContext);
    const allLinks = await this.getCollection(Config.COLLECTIONS.LINKS, dbContext);
    const allPasswords = await this.getCollection(Config.COLLECTIONS.PASSWORDS, dbContext);

    let nextFolders = [...allFolders];
    let nextFiles = [...allFiles];
    let nextLinks = [...allLinks];
    let nextPasswords = [...allPasswords];

    let initialParentPath = '';
    if (targetParentId) {
      const breadcrumbs = [];
      let current = allFolders.find(f => f._id === targetParentId && !f.deleted);
      while (current) {
        breadcrumbs.unshift(current.folderName);
        const parentId = current.parentFolderId;
        if (!parentId) break;
        current = allFolders.find(f => f._id === parentId && !f.deleted);
      }
      initialParentPath = breadcrumbs.join('/');
    }

    function duplicateFolderRecursive(sourceFolderId, nextParentId, isRoot = false, parentPath = '') {
      const sourceFolder = allFolders.find(folder => folder._id === sourceFolderId && !folder.deleted);
      if (!sourceFolder) {
        return;
      }

      const newFolderId = `local_${Math.random().toString(36).slice(2, 11)}`;
      const folderName = isRoot ? `${sourceFolder.folderName} - Copy` : sourceFolder.folderName;
      const newFolderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

      // Find the parent folder name
      let parentFolderName = null;
      if (nextParentId) {
        const parentFolder = nextFolders.find(f => f._id === nextParentId);
        if (parentFolder) {
          parentFolderName = parentFolder.folderName;
        }
      } else if (targetParentId) {
        const parentFolder = allFolders.find(f => f._id === targetParentId && !f.deleted);
        if (parentFolder) {
          parentFolderName = parentFolder.folderName;
        }
      }

      const newFolder = {
        _id: newFolderId,
        folderName: folderName,
        parentFolderId: nextParentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
      nextFolders.push(newFolder);

      for (const file of allFiles.filter(item => item.folderId === sourceFolderId && !item.deleted)) {
        const dotIndex = file.fileName.lastIndexOf('.');
        const copiedName = dotIndex > 0
          ? `${file.fileName.slice(0, dotIndex)}_copy${file.fileName.slice(dotIndex)}`
          : `${file.fileName}_copy`;

        nextFiles.push({
          ...file,
          _id: `local_${Math.random().toString(36).slice(2, 11)}`,
          folderId: newFolderId,
          fileName: copiedName,
          folderName: folderName,
          parentFolderName: parentFolderName,
          folderPath: newFolderPath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      for (const link of allLinks.filter(item => item.folderId === sourceFolderId && !item.deleted)) {
        nextLinks.push({
          ...link,
          _id: `local_${Math.random().toString(36).slice(2, 11)}`,
          folderId: newFolderId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      for (const password of allPasswords.filter(item => item.folderId === sourceFolderId && !item.deleted)) {
        nextPasswords.push({
          ...password,
          _id: `local_${Math.random().toString(36).slice(2, 11)}`,
          folderId: newFolderId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const childFolders = allFolders.filter(folder => folder.parentFolderId === sourceFolderId && !folder.deleted);
      for (const childFolder of childFolders) {
        duplicateFolderRecursive(childFolder._id, newFolderId, false, newFolderPath);
      }
    }

    duplicateFolderRecursive(folderId, targetParentId, true, targetParentId ? initialParentPath : '');

    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.FOLDERS, nextFolders);
    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.FILES, nextFiles);
    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.LINKS, nextLinks);
    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.PASSWORDS, nextPasswords);

    return { success: true };
  },

  async updateItem(type, id, updatedFields, dbContext) {
    const { isConnected, refreshData } = dbContext;

    if (isConnected && !id.toString().startsWith('local_')) {
      try {
        const savedResult = await firebaseService.updateItem(type, id, updatedFields);
        await refreshData();
        return savedResult;
      } catch (error) {
        console.error(`Cloud update failed for ${type}/${id}. Updating local cache.`, {
          updatedFields,
          errorCode: error?.code || null,
          errorMessage: error?.message || 'Unknown update error',
        });
      }
    }

    if (dbContext.enqueueSyncTask) {
      await dbContext.enqueueSyncTask(type, 'update', id, updatedFields);
    }

    const currentList = await this.getCollection(type, dbContext);
    const updatedList = currentList.map(item => (
      item._id === id
        ? { ...item, ...updatedFields, updatedAt: new Date().toISOString() }
        : item
    ));

    await dbContext.saveOfflineCacheDirectly(type, updatedList);
    return { success: true, id };
  },

  async deleteItem(type, id, dbContext, permanent = false) {
    const { isConnected, refreshData } = dbContext;

    if (isConnected && !id.toString().startsWith('local_')) {
      try {
        const result = type === Config.COLLECTIONS.FOLDERS
          ? await firebaseService.deleteFolderTree(id, permanent)
          : await firebaseService.deleteItem(type, id, permanent);
        await refreshData();
        return result;
      } catch (error) {
        console.error(`Cloud delete failed for ${type}/${id}. Deleting locally.`, {
          permanent,
          errorCode: error?.code || null,
          errorMessage: error?.message || 'Unknown delete error',
        });
      }
    }

    if (dbContext.enqueueSyncTask) {
      await dbContext.enqueueSyncTask(type, permanent ? 'permanent_delete' : 'delete', id);
    }

    const allFolders = await this.getCollection(Config.COLLECTIONS.FOLDERS, dbContext);
    const allFiles = await this.getCollection(Config.COLLECTIONS.FILES, dbContext);
    const allLinks = await this.getCollection(Config.COLLECTIONS.LINKS, dbContext);
    const allPasswords = await this.getCollection(Config.COLLECTIONS.PASSWORDS, dbContext);
    const allTasks = await this.getCollection(Config.COLLECTIONS.TASKS, dbContext);

    let nextFolders = [...allFolders];
    let nextFiles = [...allFiles];
    let nextLinks = [...allLinks];
    let nextPasswords = [...allPasswords];
    let nextTasks = [...allTasks];

    if (permanent) {
      if (type === Config.COLLECTIONS.FOLDERS) {
        const folderIdsToDelete = [];
        const gatherFolderIdsRecursive = (folderId) => {
          folderIdsToDelete.push(folderId);
          allFolders
            .filter(folder => folder.parentFolderId === folderId)
            .forEach(folder => gatherFolderIdsRecursive(folder._id));
        };

        gatherFolderIdsRecursive(id);

        for (const file of allFiles.filter(item => folderIdsToDelete.includes(item.folderId))) {
          deletePhysicalFile(file.fileUrl);
        }

        nextFolders = nextFolders.filter(folder => !folderIdsToDelete.includes(folder._id));
        nextFiles = nextFiles.filter(file => !folderIdsToDelete.includes(file.folderId));
        nextLinks = nextLinks.filter(link => !folderIdsToDelete.includes(link.folderId));
        nextPasswords = nextPasswords.filter(password => !folderIdsToDelete.includes(password.folderId));
      } else if (type === Config.COLLECTIONS.FILES) {
        const targetFile = allFiles.find(file => file._id === id);
        if (targetFile) {
          deletePhysicalFile(targetFile.fileUrl);
        }
        nextFiles = nextFiles.filter(file => file._id !== id);
      } else if (type === Config.COLLECTIONS.LINKS) {
        nextLinks = nextLinks.filter(link => link._id !== id);
      } else if (type === Config.COLLECTIONS.PASSWORDS) {
        nextPasswords = nextPasswords.filter(password => password._id !== id);
      } else if (type === Config.COLLECTIONS.TASKS) {
        nextTasks = nextTasks.filter(task => task._id !== id);
      }
    } else if (type === Config.COLLECTIONS.FOLDERS) {
      const softDeleteRecursive = (folderId) => {
        nextFolders = nextFolders.map(folder => (
          folder._id === folderId
            ? { ...folder, deleted: true, updatedAt: new Date().toISOString() }
            : folder
        ));
        nextFiles = nextFiles.map(file => (
          file.folderId === folderId
            ? { ...file, deleted: true, updatedAt: new Date().toISOString() }
            : file
        ));
        nextLinks = nextLinks.map(link => (
          link.folderId === folderId
            ? { ...link, deleted: true, updatedAt: new Date().toISOString() }
            : link
        ));
        nextPasswords = nextPasswords.map(password => (
          password.folderId === folderId
            ? { ...password, deleted: true, updatedAt: new Date().toISOString() }
            : password
        ));

        allFolders
          .filter(folder => folder.parentFolderId === folderId && !folder.deleted)
          .forEach(folder => softDeleteRecursive(folder._id));
      };

      softDeleteRecursive(id);
    } else {
      const nextList = (
        type === Config.COLLECTIONS.FILES ? nextFiles :
        type === Config.COLLECTIONS.LINKS ? nextLinks :
        type === Config.COLLECTIONS.PASSWORDS ? nextPasswords :
        nextTasks
      )
        .map(item => (
          item._id === id
            ? { ...item, deleted: true, updatedAt: new Date().toISOString() }
            : item
        ));

      if (type === Config.COLLECTIONS.FILES) {
        nextFiles = nextList;
      } else if (type === Config.COLLECTIONS.LINKS) {
        nextLinks = nextList;
      } else if (type === Config.COLLECTIONS.PASSWORDS) {
        nextPasswords = nextList;
      } else if (type === Config.COLLECTIONS.TASKS) {
        nextTasks = nextList;
      }
    }

    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.FOLDERS, nextFolders);
    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.FILES, nextFiles);
    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.LINKS, nextLinks);
    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.PASSWORDS, nextPasswords);
    await dbContext.saveOfflineCacheDirectly(Config.COLLECTIONS.TASKS, nextTasks);

    return { success: true, id };
  },
};
