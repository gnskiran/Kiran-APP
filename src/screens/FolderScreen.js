import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView, RefreshControl, BackHandler } from 'react-native';
import { Grid, List, Plus, Folder, ArrowUpDown, CornerDownRight, Check, X, Upload, Trash2 } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { folderService } from '../services/folderService';
import { fileService } from '../services/fileService';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import CreateFolderModal from '../components/CreateFolderModal';
import CreateFileModal from '../components/CreateFileModal';
import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';
import UploadProgressModal from '../components/UploadProgressModal';

export default function FolderScreen({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { folders, files, refreshData, loading } = dbContext;

  const [currentFolderId, setCurrentFolderId] = useState(null);

  const [isGridView, setIsGridView] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'date'
  const [sortVisible, setSortVisible] = useState(false);

  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  
  const [selectedFolderToRename, setSelectedFolderToRename] = useState(null);
  const [selectedFileToRename, setSelectedFileToRename] = useState(null);

  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [itemToMove, setItemToMove] = useState(null); // { id, type }
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);

  // Advanced File Upload Progress state
  const [uploadProgressVisible, setUploadProgressVisible] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState(0);
  const [pendingFileData, setPendingFileData] = useState(null);

  useEffect(() => {
    if (route.params?.folderId !== undefined) {
      setCurrentFolderId(route.params.folderId);
    }
  }, [route.params?.folderId]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedFolderIds([]);
  }, [currentFolderId]);

  useEffect(() => {
    const onBackPress = () => {
      if (currentFolderId) {
        const currentFolder = folders.find(f => f._id === currentFolderId);
        const parentId = currentFolder ? currentFolder.parentFolderId : null;
        setCurrentFolderId(parentId);
        navigation.setParams({ folderId: parentId });
        return true; // Intercept
      }
      return false; // Default
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [currentFolderId, folders, navigation]);

  useEffect(() => {
    if (route.params?.fileToOpen) {
      const targetFile = route.params.fileToOpen;
      navigation.setParams({ fileToOpen: null });
      navigation.navigate('FileDetails', { file: targetFile });
    }
  }, [route.params?.fileToOpen]);

  const getContents = () => {
    const activeFolders = folders.filter(f => f.parentFolderId === currentFolderId && !f.deleted);
    const activeFiles = files.filter(f => f.folderId === currentFolderId && !f.deleted);

    const sortFn = (a, b) => {
      const aName = a.folderName || a.fileName || a.title || '';
      const bName = b.folderName || b.fileName || b.title || '';
      if (sortBy === 'name') {
        return aName.localeCompare(bName);
      } else {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    };

    return {
      subfolders: activeFolders.sort(sortFn),
      files: activeFiles.sort(sortFn),
    };
  };

  const { subfolders, files: folderFiles } = getContents();
  const totalItems = subfolders.length + folderFiles.length;

  const breadcrumbs = folderService.getBreadcrumbs(currentFolderId, folders);

  const handleBreadcrumbPress = (targetId) => {
    setCurrentFolderId(targetId);
    navigation.setParams({ folderId: targetId });
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedFolderIds([]);
  };

  const startSelection = (folderId) => {
    setSelectionMode(true);
    setSelectedFolderIds([folderId]);
  };

  const toggleFolderSelection = (folderId) => {
    setSelectionMode(true);
    setSelectedFolderIds((current) => (
      current.includes(folderId)
        ? current.filter(id => id !== folderId)
        : [...current, folderId]
    ));
  };

  const handleBulkDeleteFolders = () => {
    if (selectedFolderIds.length === 0) {
      return;
    }

    const totalSelected = selectedFolderIds.length;
    Alert.alert(
      'Delete Selected Folders?',
      `This will soft-delete ${totalSelected} selected folder${totalSelected > 1 ? 's' : ''} and each folder's contents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedFolderIds.map(folderId => folderService.deleteFolder(folderId, dbContext)));
              clearSelection();
            } catch (error) {
              Alert.alert('Delete Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSaveFolder = async (folderName) => {
    try {
      if (selectedFolderToRename) {
        await folderService.renameFolder(selectedFolderToRename._id, folderName, dbContext);
        setSelectedFolderToRename(null);
      } else {
        await folderService.createFolder(folderName, currentFolderId, dbContext);
      }
      setFolderModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteFolder = (folderId, name) => {
    Alert.alert(
      'Delete Folder? ⚠️',
      `This will soft-delete "${name}" and all its contents recursively.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await folderService.deleteFolder(folderId, dbContext);
          }
        }
      ]
    );
  };

  // Trigger recursive folder duplication
  const handleCopyFolder = async (folderId, folderName) => {
    try {
      Alert.alert(
        'Copy Folder Structure? 📋',
        `This will recursively duplicate "${folderName}" and all its subfolders, files, bookmarks, and secret vault entries to root parent.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy Everywhere',
            onPress: async () => {
              await folderService.copyFolder(folderId, null, dbContext);
              Alert.alert('Success 🎉', `"${folderName}" tree successfully copied!`);
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Copy Error', e.message);
    }
  };

  // Upgraded document upload trigger
  const handlePickFile = async () => {
    try {
      setFileModalVisible(false);
      const fileData = await fileService.pickAndPrepareFile(currentFolderId, dbContext);
      if (fileData) {
        setUploadFileName(fileData.fileName);
        setUploadFileSize(fileData.originalFileSize);
        setPendingFileData(fileData);
        setUploadProgressVisible(true);
      }
    } catch (e) {
      Alert.alert('Picker Error', e.message);
    }
  };

  const handleUploadOptimizationComplete = async (sizes) => {
    if (!pendingFileData) return;
    try {
      await fileService.uploadDirectFile(pendingFileData, dbContext);
      setPendingFileData(null);
    } catch (e) {
      Alert.alert('Cloud Sync Error', e.message);
    }
  };

  const handleCreateTextFile = async (name, content) => {
    try {
      const originalFileSize = content.length;
      const compressedFileSize = Math.floor(originalFileSize * 0.6);

      const body = {
        folderId: currentFolderId,
        fileName: name,
        fileType: 'text/plain',
        originalFileSize,
        compressedFileSize,
        fileUrl: content,
        thumbnailUrl: ''
      };
      await fileService.uploadDirectFile(body, dbContext);
      setFileModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRenameFileSave = async (newName) => {
    try {
      if (selectedFileToRename) {
        await fileService.renameFile(selectedFileToRename._id, newName, dbContext);
        setSelectedFileToRename(null);
        setFileModalVisible(false);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const openMoveModal = (itemId, itemType) => {
    setItemToMove({ id: itemId, type: itemType });
    setMoveModalVisible(true);
  };

  const handleMoveAction = async (targetFolderId) => {
    if (!itemToMove) return;
    try {
      if (itemToMove.type === 'folder') {
        if (itemToMove.id === targetFolderId) {
          Alert.alert('Operation Blocked 🚫', 'A folder cannot be moved inside itself.');
          return;
        }
        await folderService.moveFolder(itemToMove.id, targetFolderId, dbContext);
      } else {
        await fileService.moveFile(itemToMove.id, targetFolderId, dbContext);
      }
      setMoveModalVisible(false);
      setItemToMove(null);
      Alert.alert('Moved 🎉', 'Item successfully moved!');
    } catch (e) {
      Alert.alert('Move error', e.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        breadcrumbs={breadcrumbs} 
        onBreadcrumbPress={handleBreadcrumbPress} 
      />

      {/* Control Action Bar */}
      <View style={[styles.controlBar, { borderBottomColor: colors.border }]}>
        {selectionMode ? (
          <>
            <View style={styles.leftControls}>
              <TouchableOpacity
                onPress={() => {
                  const allIds = subfolders.map(f => f._id);
                  const isAllSelected = allIds.length > 0 && allIds.every(id => selectedFolderIds.includes(id));
                  if (isAllSelected) {
                    setSelectedFolderIds([]);
                  } else {
                    setSelectedFolderIds(allIds);
                  }
                }}
                style={{ marginRight: 14 }}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                  {subfolders.length > 0 && subfolders.map(f => f._id).every(id => selectedFolderIds.includes(id)) ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.selectionText, { color: colors.text }]}>
                {selectedFolderIds.length} selected
              </Text>
            </View>

            <View style={styles.rightControls}>
              <TouchableOpacity onPress={handleBulkDeleteFolders} style={styles.iconControlBtn}>
                <Trash2 size={18} color={colors.danger} />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSelection} style={styles.iconControlBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.leftControls}>
              <TouchableOpacity onPress={() => setSortVisible(true)} style={styles.controlBtn}>
                <ArrowUpDown size={16} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.controlBtnText, { color: colors.text }]}>
                  Sort: {sortBy === 'name' ? 'A-Z' : 'Recent'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rightControls}>
              <TouchableOpacity onPress={() => setSelectionMode(true)} style={styles.controlBtn}>
                <Text style={[styles.controlBtnText, { color: colors.primary }]}>Select</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsGridView(!isGridView)} style={styles.iconControlBtn}>
                {isGridView ? (
                  <List size={20} color={colors.text} />
                ) : (
                  <Grid size={20} color={colors.text} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* List content list */}
      {totalItems === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} colors={[colors.primary]} />
        }>
          <EmptyState
            title="Empty Directory"
            description="No subfolders or files found in this path."
            actionLabel="Add Subfolder"
            onAction={() => setFolderModalVisible(true)}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={[
            ...subfolders.map(f => ({ ...f, cardType: 'folder' })),
            ...folderFiles.map(fi => ({ ...fi, cardType: 'file' })),
          ]}
          keyExtractor={(item) => item._id}
          numColumns={isGridView ? 2 : 1}
          key={isGridView ? 'GRID_F' : 'LIST_F'}
          contentContainerStyle={styles.listContainer}
          onRefresh={refreshData}
          refreshing={loading}
          renderItem={({ item }) => {
            if (item.cardType === 'folder') {
              return (
                <FolderCard
                  folder={item}
                  isGridView={isGridView}
                  onPress={() => handleBreadcrumbPress(item._id)}
                  onLongPress={() => startSelection(item._id)}
                  onRename={() => {
                    setSelectedFolderToRename(item);
                    setFolderModalVisible(true);
                  }}
                  onMove={() => openMoveModal(item._id, 'folder')}
                  onCopy={() => handleCopyFolder(item._id, item.folderName)}
                  onDelete={() => handleDeleteFolder(item._id, item.folderName)}
                  selectionMode={selectionMode}
                  selected={selectedFolderIds.includes(item._id)}
                  onToggleSelect={() => toggleFolderSelection(item._id)}
                />
              );
            }
            if (item.cardType === 'file') {
              return (
                <FileCard
                  file={item}
                  isGridView={isGridView}
                  onPress={() => navigation.navigate('FileDetails', { file: item })}
                  onRename={() => {
                    setSelectedFileToRename(item);
                    setFileModalVisible(true);
                  }}
                  onMove={() => openMoveModal(item._id, 'file')}
                  onDelete={() => {
                    Alert.alert(
                      'Delete File? ⚠️',
                      `Are you sure you want to delete "${item.fileName}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => fileService.deleteFile(item._id, dbContext) }
                      ]
                    );
                  }}
                />
              );
            }
            return null;
          }}
        />
      )}

      {/* FABs buttons */}
      {!selectionMode ? (
        <>
          <TouchableOpacity 
            style={[styles.fabBtn, { backgroundColor: colors.primary }]}
            onPress={() => setFolderModalVisible(true)}
            activeOpacity={0.85}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.subFabBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => setFileModalVisible(true)}
            activeOpacity={0.85}
          >
            <Upload size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      ) : null}

      {/* Sort Select Modal */}
      <Modal
        visible={sortVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSortVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortVisible(false)}>
          <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sortTitle, { color: colors.textSecondary }]}>Sort Items By</Text>
            
            <TouchableOpacity 
              style={[styles.sortItem, { borderBottomColor: colors.border }]} 
              onPress={() => { setSortBy('name'); setSortVisible(false); }}
            >
              <Text style={[styles.sortItemText, { color: colors.text, fontWeight: sortBy === 'name' ? '700' : '400' }]}>Alphabetic (A-Z)</Text>
              {sortBy === 'name' && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sortItem} 
              onPress={() => { setSortBy('date'); setSortVisible(false); }}
            >
              <Text style={[styles.sortItemText, { color: colors.text, fontWeight: sortBy === 'date' ? '700' : '400' }]}>Creation Date (Recent)</Text>
              {sortBy === 'date' && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Move picker dialog */}
      <Modal
        visible={moveModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setMoveModalVisible(false); setItemToMove(null); }}
      >
        <View style={styles.moveOverlay}>
          <View style={[styles.moveContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.moveHeader}>
              <Text style={[styles.moveTitleText, { color: colors.text }]}>Move to Folder</Text>
              <TouchableOpacity onPress={() => { setMoveModalVisible(false); setItemToMove(null); }}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.moveScroll}>
              <TouchableOpacity 
                style={[styles.moveOption, { borderBottomWidth: 0.5, borderColor: colors.border }]}
                onPress={() => handleMoveAction(null)}
              >
                <CornerDownRight size={18} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.moveOptionText, { color: colors.text, fontWeight: '700' }]}>[My Drive - Root]</Text>
              </TouchableOpacity>

              {folders.filter(f => !f.deleted && f._id !== itemToMove?.id).map(fld => (
                <TouchableOpacity 
                  key={fld._id}
                  style={[styles.moveOption, { borderBottomWidth: 0.5, borderColor: colors.border }]}
                  onPress={() => handleMoveAction(fld._id)}
                >
                  <Folder size={16} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.moveOptionText, { color: colors.text }]}>{fld.folderName}</Text>
                </TouchableOpacity>
              ))}

              {folders.filter(f => !f.deleted && f._id !== itemToMove?.id).length === 0 && (
                <Text style={[styles.moveEmpty, { color: colors.textSecondary }]}>No other folders available.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modals wrappers */}
      <CreateFolderModal
        visible={folderModalVisible}
        folderToEdit={selectedFolderToRename}
        onSave={handleSaveFolder}
        onCancel={() => { setFolderModalVisible(false); setSelectedFolderToRename(null); }}
      />

      <CreateFileModal
        visible={fileModalVisible}
        fileToEdit={selectedFileToRename}
        onUploadPick={handlePickFile}
        onCreateTextFile={handleCreateTextFile}
        onRenameSave={handleRenameFileSave}
        onCancel={() => { setFileModalVisible(false); setSelectedFileToRename(null); }}
      />

      {/* Compression progress modal modal */}
      <UploadProgressModal
        visible={uploadProgressVisible}
        fileName={uploadFileName}
        fileSize={uploadFileSize}
        isImage={uploadFileName.split('.').pop().toLowerCase().match(/png|jpg|jpeg|webp/)}
        onComplete={handleUploadOptimizationComplete}
        onCancel={() => {
          setUploadProgressVisible(false);
          setPendingFileData(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: 1,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconControlBtn: {
    padding: 6,
  },
  listContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4.5,
    zIndex: 99,
  },
  subFabBtn: {
    position: 'absolute',
    bottom: 92,
    right: 28,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 99,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortMenu: {
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  sortTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  sortItemText: {
    fontSize: 14,
  },
  moveOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  moveContainer: {
    width: '100%',
    maxHeight: '65%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
  },
  moveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moveTitleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  moveScroll: {
    paddingBottom: 24,
  },
  moveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  moveOptionText: {
    fontSize: 14,
  },
  moveEmpty: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  }
});
