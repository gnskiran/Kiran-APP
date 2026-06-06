import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { storageService } from './storageService';

// Helper to get folder hierarchy details
function getFolderDetails(folderId, folders) {
  if (!folderId) {
    return {
      folderName: null,
      parentFolderName: null,
      folderPath: null
    };
  }

  const immediateFolder = folders.find(f => f._id === folderId && !f.deleted);
  if (!immediateFolder) {
    return {
      folderName: null,
      parentFolderName: null,
      folderPath: null
    };
  }

  const folderName = immediateFolder.folderName;

  let parentFolderName = null;
  if (immediateFolder.parentFolderId) {
    const parentFolder = folders.find(f => f._id === immediateFolder.parentFolderId && !f.deleted);
    if (parentFolder) {
      parentFolderName = parentFolder.folderName;
    }
  }

  const breadcrumbs = [];
  let current = immediateFolder;
  while (current) {
    breadcrumbs.unshift(current.folderName);
    const parentId = current.parentFolderId;
    if (!parentId) break;
    current = folders.find(f => f._id === parentId && !f.deleted);
  }
  const folderPath = breadcrumbs.join('/');

  return {
    folderName,
    parentFolderName,
    folderPath
  };
}

export const fileService = {
  async getFiles(dbContext) {
    return await storageService.getCollection('files', dbContext);
  },

  // Pick file and calculate compression parameters
  async pickAndPrepareFile(folderId, dbContext, onProgressTrigger) {
    try {
      console.log("Opening native file picker...");
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("File picker canceled.");
        return null;
      }

      const asset = result.assets[0];
      const { name, size, mimeType, uri } = asset;

      // Copy picked binary locally
      const permanentDirectory = FileSystem.documentDirectory + 'KiranDrive/';
      const dirInfo = await FileSystem.getInfoAsync(permanentDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(permanentDirectory, { intermediates: true });
      }

      const permanentUri = permanentDirectory + Date.now() + '_' + name;
      await FileSystem.copyAsync({ from: uri, to: permanentUri });

      const safeMimeType = mimeType || 'application/octet-stream';
      const isImage = safeMimeType.startsWith('image/');
      
      // Calculate compression specs
      const originalFileSize = size || 0;
      const compressionMultiplier = isImage ? 0.42 : 0.65;
      const compressedFileSize = Math.floor(originalFileSize * compressionMultiplier);

      const fileDetails = {
        folderId: folderId || null,
        fileName: name,
        fileType: safeMimeType,
        originalFileSize,
        compressedFileSize,
        fileUrl: permanentUri,
        thumbnailUrl: isImage ? permanentUri : ''
      };

      // Trigger the progress modal callback
      if (onProgressTrigger) {
        await onProgressTrigger(fileDetails);
      }

      return fileDetails;
    } catch (error) {
      console.error("Error preparing file details:", error);
      throw error;
    }
  },

  // Final insertion of files inside database
  async uploadDirectFile(fileData, dbContext) {
    const { folders } = dbContext || {};
    const folderDetails = getFolderDetails(fileData.folderId, folders || []);
    const enrichedData = {
      ...fileData,
      ...folderDetails
    };
    return await storageService.insertItem('files', enrichedData, dbContext);
  },

  // Rename file
  async renameFile(fileId, newName, dbContext) {
    return await storageService.updateItem('files', fileId, { fileName: newName }, dbContext);
  },

  // Move file
  async moveFile(fileId, targetFolderId, dbContext) {
    const { folders } = dbContext || {};
    const folderDetails = getFolderDetails(targetFolderId, folders || []);
    return await storageService.updateItem('files', fileId, {
      folderId: targetFolderId,
      ...folderDetails
    }, dbContext);
  },

  // Soft Delete file
  async deleteFile(fileId, dbContext) {
    return await storageService.deleteItem('files', fileId, dbContext, false);
  }
};
