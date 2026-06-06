import { storageService } from './storageService';

export const folderService = {
  async getFolders(dbContext) {
    return await storageService.getCollection('folders', dbContext);
  },

  async createFolder(folderName, parentFolderId, dbContext) {
    const body = {
      folderName,
      parentFolderId: parentFolderId || null
    };
    return await storageService.insertItem('folders', body, dbContext);
  },

  async renameFolder(folderId, newName, dbContext) {
    return await storageService.updateItem('folders', folderId, { folderName: newName }, dbContext);
  },

  async moveFolder(folderId, targetParentFolderId, dbContext) {
    return await storageService.updateItem('folders', folderId, { parentFolderId: targetParentFolderId }, dbContext);
  },

  // Recursive copy folder trigger
  async copyFolder(folderId, targetParentId, dbContext) {
    return await storageService.copyFolder(folderId, targetParentId, dbContext);
  },

  async deleteFolder(folderId, dbContext) {
    return await storageService.deleteItem('folders', folderId, dbContext);
  },

  getBreadcrumbs(currentFolderId, allFolders) {
    if (!currentFolderId) return [];
    
    const breadcrumbs = [];
    let current = allFolders.find(f => f._id === currentFolderId && !f.deleted);
    
    while (current) {
      breadcrumbs.unshift({
        _id: current._id,
        folderName: current.folderName
      });
      
      const parentId = current.parentFolderId;
      if (!parentId) break;
      
      current = allFolders.find(f => f._id === parentId && !f.deleted);
    }
    
    return breadcrumbs;
  },

  // Premium recursive counts solver
  getNestedFolderStats(folderId, allFolders, allFiles) {
    let subfoldersCount = 0;
    let filesCount = 0;
    let totalSize = 0;

    function countRecursive(fldId) {
      const childrenFlds = allFolders.filter(f => f.parentFolderId === fldId && !f.deleted);
      subfoldersCount += childrenFlds.length;
      
      const folderFiles = allFiles.filter(fi => fi.folderId === fldId && !fi.deleted);
      filesCount += folderFiles.length;
      folderFiles.forEach(file => {
        totalSize += file.compressedFileSize || file.fileSize || 0;
      });

      for (const child of childrenFlds) {
        countRecursive(child._id);
      }
    }

    countRecursive(folderId);

    return {
      subfoldersCount,
      filesCount,
      totalSize
    };
  }
};
