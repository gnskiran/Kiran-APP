import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Folder, File, Link2, Key, ChevronRight, Plus, FolderPlus, Upload, KeyRound, Link, HardDrive, Sparkles, Trash2, ClipboardList } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { fileService } from '../services/fileService';
import { folderService } from '../services/folderService';
import { passwordService } from '../services/passwordService';
import { linkService } from '../services/linkService';
import { Config } from '../constants/Config';
import { formatFileSize } from '../components/FileCard';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import CreateFolderModal from '../components/CreateFolderModal';
import CreateFileModal from '../components/CreateFileModal';
import CreatePasswordModal from '../components/CreatePasswordModal';
import CreateLinkModal from '../components/CreateLinkModal';
import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';
import LinkCard from '../components/LinkCard';
import PasswordCard from '../components/PasswordCard';
import UploadProgressModal from '../components/UploadProgressModal';

export default function HomeScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { folders, files, links, passwords, tasks, refreshData, loading, isConnected } = dbContext;

  const [searchVal, setSearchVal] = useState('');

  // Modals state
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);

  // Advanced File Upload Progress state
  const [uploadProgressVisible, setUploadProgressVisible] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState(0);
  const [pendingFileData, setPendingFileData] = useState(null);

  // Calculate Storage Stats
  const getStorageStats = () => {
    const activeFiles = files.filter(f => !f.deleted);
    const totalCapacity = Config.FIREBASE_STORAGE_CAPACITY_BYTES || 0;
    let originalTotal = 0;
    let compressedTotal = 0;

    activeFiles.forEach(file => {
      originalTotal += file.originalFileSize || file.fileSize || 0;
      compressedTotal += file.compressedFileSize || file.fileSize || 0;
    });

    const savedBytes = originalTotal - compressedTotal;
    const savedPercent = originalTotal > 0 ? Math.round((savedBytes / originalTotal) * 100) : 0;
    const remainingQuota = Math.max(0, totalCapacity - compressedTotal);
    const quotaUsedPercent = totalCapacity > 0
      ? Math.min(100, Math.round((compressedTotal / totalCapacity) * 100))
      : 0;

    return {
      totalCapacity,
      originalTotal,
      compressedTotal,
      savedBytes,
      savedPercent,
      remainingQuota,
      quotaUsedPercent
    };
  };

  const storageStats = getStorageStats();

  const handleQuickSearch = (txt) => {
    navigation.navigate('Search', { initialQuery: txt });
  };

  // CRUD actions for Modals
  const handleCreateFolder = async (folderName) => {
    try {
      await folderService.createFolder(folderName, null, dbContext);
      setFolderModalVisible(false);
      Alert.alert('Success 🎉', `Folder "${folderName}" created successfully.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Upgraded document upload routine supporting estimated size reductions and progress bars!
  const handlePickUploadFile = async () => {
    try {
      setFileModalVisible(false);
      
      // Phase 1: Native file pick & copy to cache cache
      const fileData = await fileService.pickAndPrepareFile(null, dbContext);
      if (fileData) {
        setUploadFileName(fileData.fileName);
        setUploadFileSize(fileData.originalFileSize);
        setPendingFileData(fileData);
        
        // Phase 2: Launch the upload/compression progress modal modal
        setUploadProgressVisible(true);
      }
    } catch (e) {
      Alert.alert('Upload Error', e.message);
    }
  };

  const handleUploadOptimizationComplete = async (sizes) => {
    if (!pendingFileData) return;
    try {
      // Sync the optimized document details with Firebase
      await fileService.uploadDirectFile(pendingFileData, dbContext);
      setPendingFileData(null);
      Alert.alert('Optimization Complete! ⚡', `Original size: ${formatFileSize(sizes.originalSize)}\nOptimized: ${formatFileSize(sizes.compressedSize)}\nStored inside Kiran.`);
    } catch (e) {
      Alert.alert('Database Sync Error', e.message);
    }
  };

  const handleCreateTextFile = async (name, content) => {
    try {
      const originalFileSize = content.length;
      // Text compression saves 40%
      const compressedFileSize = Math.floor(originalFileSize * 0.6);
      
      const fileBody = {
        folderId: null,
        fileName: name,
        fileType: 'text/plain',
        originalFileSize,
        compressedFileSize,
        fileUrl: content,
        thumbnailUrl: ''
      };
      await fileService.uploadDirectFile(fileBody, dbContext);
      setFileModalVisible(false);
      Alert.alert('Success 🎉', `Text document "${name}" saved.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCreatePassword = async (passBody) => {
    try {
      await passwordService.createPassword(
        passBody.title,
        passBody.website,
        passBody.username,
        passBody.password,
        passBody.notes,
        null,
        dbContext
      );
      setPasswordModalVisible(false);
      Alert.alert(
        'Saved',
        isConnected
          ? `Password entry for "${passBody.title}" was saved and synced to Firebase.`
          : `Password entry for "${passBody.title}" was saved offline and will auto-sync to Firebase when the connection returns.`
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCreateLink = async (linkBody) => {
    try {
      await linkService.createLink(linkBody.title, linkBody.url, linkBody.notes, null, dbContext);
      setLinkModalVisible(false);
      Alert.alert('Saved 🎉', `Bookmark "${linkBody.title}" successfully saved.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Recent Items: filter and sort by timestamp
  const getRecents = () => {
    const activeFolders = folders.filter(f => !f.deleted).map(x => ({ ...x, itemType: 'folder' }));
    const activeFiles = files.filter(f => !f.deleted).map(x => ({ ...x, itemType: 'file' }));
    const activeLinks = links.filter(l => !l.deleted).map(x => ({ ...x, itemType: 'link' }));
    const activePasswords = passwords.filter(p => !p.deleted).map(x => ({ ...x, itemType: 'password' }));

    const merged = [...activeFolders, ...activeFiles, ...activeLinks, ...activePasswords];
    return merged
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  };

  const recentItems = getRecents();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} colors={[colors.primary]} />
        }
      >
        {/* Rounded Notion style Search Bar */}
        <SearchBar 
          value={searchVal}
          placeholder="Search documents, vaults, bookmarks..."
          onClear={() => setSearchVal('')}
          onChangeText={(txt) => {
            setSearchVal(txt);
            handleQuickSearch(txt);
          }}
        />

        {/* ==========================================
            DROPBOX STORAGE DASHBOARD WIDGET
           ========================================== */}
        <View style={[styles.storageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.storageHeader}>
            <View style={styles.storageTitleRow}>
              <HardDrive size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.storageTitle, { color: colors.text }]}>Drive Storage</Text>
            </View>
            <View style={[styles.savingsBadge, { backgroundColor: colors.accentLight }]}>
              <Sparkles size={10} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.savingsText, { color: colors.accent }]}>
                -{storageStats.savedPercent}% Storage Saved
              </Text>
            </View>
          </View>

          {/* Progress fill bar fill */}
          <View style={[styles.quotaTrack, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.quotaFill, 
                { 
                  backgroundColor: colors.primary, 
                  width: `${Math.max(4, storageStats.quotaUsedPercent)}%` 
                }
              ]} 
            />
          </View>

          <View style={styles.quotaDetails}>
            <Text style={[styles.quotaUsed, { color: colors.text }]}>
              {formatFileSize(storageStats.compressedTotal)} used of {formatFileSize(storageStats.totalCapacity)} Firebase storage
            </Text>
            <Text style={[styles.quotaRemaining, { color: colors.textSecondary }]}>
              {formatFileSize(storageStats.remainingQuota)} remaining in Firebase
            </Text>
          </View>

          {storageStats.savedBytes > 0 && (
            <View style={[styles.savingsNote, { borderTopColor: colors.border }]}>
              <Text style={[styles.savingsNoteText, { color: colors.textSecondary }]}>
                💡 Hybrid compression saved <Text style={{ color: colors.accent, fontWeight: '700' }}>{formatFileSize(storageStats.savedBytes)}</Text> of cloud storage usage!
              </Text>
            </View>
          )}
        </View>

        {/* Dashboard Grid Statistics Counts */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('AppHome', { screen: 'FoldersTab' })}
          >
            <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Folder size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statCount, { color: colors.text }]}>{folders.filter(f => !f.deleted).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Folders</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('FileDetails', { file: files.find(f => !f.deleted) || null })}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <File size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statCount, { color: colors.text }]}>{files.filter(f => !f.deleted).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('LinksTab')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Link2 size={20} color="#10B981" />
            </View>
            <Text style={[styles.statCount, { color: colors.text }]}>{links.filter(l => !l.deleted).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Links</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('PasswordsTab')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <Key size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.statCount, { color: colors.text }]}>{passwords.filter(p => !p.deleted).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Credentials</Text>
          </TouchableOpacity>
        </View>

        {/* Task Manager Summary Dashboard Widget */}
        <TouchableOpacity
          style={[styles.tasksWidgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AppHome', { screen: 'TasksTab' })}
          activeOpacity={0.85}
        >
          <View style={styles.tasksWidgetHeader}>
            <View style={styles.tasksWidgetTitleRow}>
              <ClipboardList size={18} color={colors.warning} style={{ marginRight: 8 }} />
              <Text style={[styles.tasksWidgetTitle, { color: colors.text }]}>Task Manager</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </View>

          <View style={styles.tasksWidgetStats}>
            <View style={styles.tasksWidgetStatItem}>
              <Text style={[styles.tasksWidgetStatCount, { color: colors.text }]}>
                {tasks ? tasks.filter(t => !t.deleted).length : 0}
              </Text>
              <Text style={[styles.tasksWidgetStatLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.tasksWidgetStatItem}>
              <Text style={[styles.tasksWidgetStatCount, { color: colors.warning }]}>
                {tasks ? tasks.filter(t => !t.deleted && t.status === 'Pending').length : 0}
              </Text>
              <Text style={[styles.tasksWidgetStatLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
            <View style={styles.tasksWidgetStatItem}>
              <Text style={[styles.tasksWidgetStatCount, { color: colors.primary }]}>
                {tasks ? tasks.filter(t => !t.deleted && t.status === 'In Progress').length : 0}
              </Text>
              <Text style={[styles.tasksWidgetStatLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            <View style={styles.tasksWidgetStatItem}>
              <Text style={[styles.tasksWidgetStatCount, { color: colors.accent }]}>
                {tasks ? tasks.filter(t => !t.deleted && t.status === 'Completed').length : 0}
              </Text>
              <Text style={[styles.tasksWidgetStatLabel, { color: colors.textSecondary }]}>Completed</Text>
            </View>
            <View style={styles.tasksWidgetStatItem}>
              <Text style={[styles.tasksWidgetStatCount, { color: colors.danger }]}>
                {tasks ? tasks.filter(t => !t.deleted && (t.status === 'Overdue' || (t.status !== 'Completed' && t.dueDate && t.dueDate < Config.getLocalDateString()))).length : 0}
              </Text>
              <Text style={[styles.tasksWidgetStatLabel, { color: colors.textSecondary }]}>Overdue</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick actions panel */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity onPress={() => setFolderModalVisible(true)} style={styles.quickActionItem}>
            <View style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FolderPlus size={20} color={colors.primary} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>Folder</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setFileModalVisible(true)} style={styles.quickActionItem}>
            <View style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Upload size={20} color="#EF4444" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setPasswordModalVisible(true)} style={styles.quickActionItem}>
            <View style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <KeyRound size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>Password</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setLinkModalVisible(true)} style={styles.quickActionItem}>
            <View style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Link size={20} color="#10B981" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>Bookmark</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Trash')} style={styles.quickActionItem}>
            <View style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Trash2 size={20} color={colors.danger} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>Trash</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Items list */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Items</Text>
        </View>

        {recentItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent activity logged.</Text>
          </View>
        ) : (
          <View style={styles.recentsList}>
            {recentItems.map((item) => {
              if (item.itemType === 'folder') {
                return (
                  <FolderCard
                    key={item._id}
                    folder={item}
                    onPress={() => navigation.navigate('AppHome', { screen: 'FoldersTab', params: { folderId: item._id } })}
                    onRename={() => {}}
                    onMove={() => {}}
                    onDelete={() => folderService.deleteFolder(item._id, dbContext)}
                  />
                );
              }
              if (item.itemType === 'file') {
                return (
                  <FileCard
                    key={item._id}
                    file={item}
                    onPress={() => navigation.navigate('FileDetails', { file: item })}
                    onRename={() => {}}
                    onMove={() => {}}
                    onDelete={() => fileService.deleteFile(item._id, dbContext)}
                  />
                );
              }
              if (item.itemType === 'link') {
                return (
                  <LinkCard
                    key={item._id}
                    bookmark={item}
                    onEdit={() => {}}
                    onDelete={() => linkService.deleteLink(item._id, dbContext)}
                  />
                );
              }
              if (item.itemType === 'password') {
                return (
                  <PasswordCard
                    key={item._id}
                    entry={item}
                    onEdit={() => {}}
                    onDelete={() => passwordService.deletePassword(item._id, dbContext)}
                  />
                );
              }
              return null;
            })}
          </View>
        )}
      </ScrollView>

      {/* Addition triggers Modals */}
      <CreateFolderModal
        visible={folderModalVisible}
        onSave={handleCreateFolder}
        onCancel={() => setFolderModalVisible(false)}
      />
      <CreateFileModal
        visible={fileModalVisible}
        onUploadPick={handlePickUploadFile}
        onCreateTextFile={handleCreateTextFile}
        onCancel={() => setFileModalVisible(false)}
      />
      <CreatePasswordModal
        visible={passwordModalVisible}
        onSave={handleCreatePassword}
        onCancel={() => setPasswordModalVisible(false)}
      />
      <CreateLinkModal
        visible={linkModalVisible}
        onSave={handleCreateLink}
        onCancel={() => setLinkModalVisible(false)}
      />

      {/* Upload/Compression Progress Bar dialog */}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  storageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '800',
  },
  quotaTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 10,
  },
  quotaFill: {
    height: '100%',
    borderRadius: 4,
  },
  quotaDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quotaUsed: {
    fontSize: 11,
    fontWeight: '700',
  },
  quotaRemaining: {
    fontSize: 11,
    fontWeight: '500',
  },
  savingsNote: {
    borderTopWidth: 0.5,
    marginTop: 12,
    paddingTop: 10,
  },
  savingsNoteText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '20%',
  },
  quickActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentsList: {
    width: '100%',
  },
  tasksWidgetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tasksWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tasksWidgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tasksWidgetTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  tasksWidgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tasksWidgetStatItem: {
    alignItems: 'center',
  },
  tasksWidgetStatCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  tasksWidgetStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  }
});
