import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Info,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { Config } from '../constants/Config';
import { formatFileSize } from '../components/FileCard';
import { storageService } from '../services/storageService';
import Header from '../components/Header';

export default function SettingsScreen({ navigation }) {
  const { colors, themeMode, updateThemeMode } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const {
    isConnected,
    checkConnection,
    loading,
    clearAllData,
    folders,
    files,
    links,
    passwords,
  } = dbContext;

  const [showConfig, setShowConfig] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleRetest = async () => {
    setTesting(true);
    const result = await checkConnection();
    setTesting(false);

    Alert.alert(
      result ? 'Cloud Sync Reachable' : 'Cloud Sync Unavailable',
      result
        ? 'Firebase synchronization is reachable.'
        : 'This build is still using local cache data.'
    );
  };

  const handleSeedTestData = async () => {
    try {
      // 1. Folders
      const docFolder = await storageService.insertItem(Config.COLLECTIONS.FOLDERS, {
        folderName: "Documents",
        parentFolderId: null,
      }, dbContext);
      
      const certFolder = await storageService.insertItem(Config.COLLECTIONS.FOLDERS, {
        folderName: "Certificates",
        parentFolderId: docFolder._id,
      }, dbContext);
      
      const btechFolder = await storageService.insertItem(Config.COLLECTIONS.FOLDERS, {
        folderName: "BTech",
        parentFolderId: certFolder._id,
      }, dbContext);

      // 2. Files
      await storageService.insertItem(Config.COLLECTIONS.FILES, {
        fileName: "BTech_Degree.pdf",
        fileType: "application/pdf",
        originalFileSize: 550000,
        compressedFileSize: 120000,
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        folderId: btechFolder._id,
        folderName: "BTech",
        parentFolderName: "Certificates",
        folderPath: "Documents/Certificates/BTech",
      }, dbContext);

      await storageService.insertItem(Config.COLLECTIONS.FILES, {
        fileName: "Profile_Photo.png",
        fileType: "image/png",
        originalFileSize: 2048000,
        compressedFileSize: 650000,
        fileUrl: "https://picsum.photos/800/600",
        folderId: docFolder._id,
        folderName: "Documents",
        parentFolderName: null,
        folderPath: "Documents",
      }, dbContext);

      // 3. Bookmarks
      await storageService.insertItem(Config.COLLECTIONS.LINKS, {
        title: "Google Search",
        url: "https://google.com",
        notes: "Primary search tool.",
        folderId: null,
      }, dbContext);

      await storageService.insertItem(Config.COLLECTIONS.LINKS, {
        title: "Expo Dev Docs",
        url: "https://docs.expo.dev",
        notes: "Reference guide for react-native components.",
        folderId: docFolder._id,
      }, dbContext);

      // 4. Credentials
      await storageService.insertItem(Config.COLLECTIONS.PASSWORDS, {
        title: "Google Account",
        website: "https://accounts.google.com",
        username: "kiran@gmail.com",
        password: "SuperSecretPassword123",
        notes: "Main recovery email account.",
        folderId: null,
      }, dbContext);

      await storageService.insertItem(Config.COLLECTIONS.PASSWORDS, {
        title: "GitHub",
        website: "https://github.com",
        username: "kiran-dev",
        password: "anotherSecurePassword!",
        notes: "Personal coding portfolio.",
        folderId: certFolder._id,
      }, dbContext);

      // 5. Tasks
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = Config.getLocalDateString(yesterday);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = Config.getLocalDateString(tomorrow);

      const todayStr = Config.getLocalDateString();

      // Task 1
      await storageService.insertItem(Config.COLLECTIONS.TASKS, {
        taskName: "Complete Kiran Drive",
        taskDescription: "Finish all Kiran Drive features and verification.",
        status: "Pending",
        priority: "High",
        createdDate: todayStr,
        dueDate: yesterdayStr,
        reminderEnabled: true,
        reminderDateTime: `${yesterdayStr} 09:00`,
        reminderDate: yesterdayStr,
        reminderTime: "09:00",
        relatedFolderId: "",
      }, dbContext);

      // Task 2
      await storageService.insertItem(Config.COLLECTIONS.TASKS, {
        taskName: "Upload Certificates",
        taskDescription: "Upload educational certificates to Kiran Drive.",
        status: "In Progress",
        priority: "Medium",
        createdDate: todayStr,
        dueDate: tomorrowStr,
        reminderEnabled: true,
        reminderDateTime: `${tomorrowStr} 09:00`,
        reminderDate: tomorrowStr,
        reminderTime: "09:00",
        relatedFolderId: certFolder._id,
      }, dbContext);

      // Task 3
      await storageService.insertItem(Config.COLLECTIONS.TASKS, {
        taskName: "Update Password Vault",
        taskDescription: "Add all personal passwords to Password Vault.",
        status: "Completed",
        priority: "High",
        createdDate: todayStr,
        dueDate: todayStr,
        reminderEnabled: true,
        reminderDateTime: `${todayStr} 09:00`,
        reminderDate: todayStr,
        reminderTime: "09:00",
        relatedFolderId: "",
      }, dbContext);

      Alert.alert("Success 🎉", "High-quality test data has been seeded successfully into the app!");
    } catch (e) {
      Alert.alert("Seeding Error", e.message);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Wipe Local Cache?',
      'This clears cached folders, files, links, passwords, and pending sync tasks from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Cache',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Cache Reset', 'All local storage caches have been cleared.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Header title="App Configuration" />

      <View style={styles.content}>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Firebase Connection</Text>
          </View>

          <View style={[styles.statusBox, { backgroundColor: isConnected ? colors.accentLight : colors.border }]}>
            {isConnected ? (
              <>
                <CheckCircle2 size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.statusLabelText, { color: colors.accent, fontWeight: '700' }]}>
                  Cloud sync active
                </Text>
              </>
            ) : (
              <>
                <AlertCircle size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.statusLabelText, { color: colors.textSecondary, fontWeight: '700' }]}>
                  Local cache mode active
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity onPress={() => setShowConfig(!showConfig)} style={styles.credsToggle}>
            <Text style={[styles.credsToggleText, { color: colors.primary }]}>
              {showConfig ? 'Hide Connection Details' : 'View Connection Details'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={[styles.credsPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.credsLabel, { color: colors.textSecondary }]}>Database Name</Text>
              <Text style={[styles.credsValue, { color: colors.text }]}>Cloud Firestore</Text>

              <Text style={[styles.credsLabel, { color: colors.textSecondary, marginTop: 8 }]}>Service Name</Text>
              <Text style={[styles.credsValue, { color: colors.text }]}>Firebase Storage</Text>

              <Text style={[styles.credsLabel, { color: colors.textSecondary, marginTop: 8 }]}>Android Package</Text>
              <Text style={[styles.credsValue, { color: colors.text }]}>{Config.FIREBASE_ANDROID_PACKAGE}</Text>

              <Text style={[styles.credsLabel, { color: colors.textSecondary, marginTop: 8 }]}>Requirements</Text>
              <Text style={[styles.credsValue, { color: colors.text }]}>
                This app uses the bundled Firebase Android configuration file and signs in anonymously on startup when Firebase Authentication is enabled.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={handleRetest}
            disabled={testing}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Check Current Connection</Text>
          </TouchableOpacity>

        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Sun size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>App Visual Theme</Text>
          </View>

          <View style={styles.themeSelectorRow}>
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark Slate', icon: Moon },
              { id: 'system', label: 'Device default', icon: Settings },
            ].map(mode => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === mode.id ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => updateThemeMode(mode.id)}
              >
                <mode.icon size={16} color={themeMode === mode.id ? '#FFFFFF' : colors.text} style={{ marginBottom: 4 }} />
                <Text style={[styles.themeOptionText, { color: themeMode === mode.id ? '#FFFFFF' : colors.text }]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage Summary</Text>
          </View>

          <View style={styles.statsPanel}>
            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textSecondary }]}>Active Directory Folders</Text>
              <Text style={[styles.statRowVal, { color: colors.text }]}>{folders.filter(item => !item.deleted).length} nodes</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textSecondary }]}>Stored Documents and Files</Text>
              <Text style={[styles.statRowVal, { color: colors.text }]}>{files.filter(item => !item.deleted).length} items</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textSecondary }]}>Saved Links</Text>
              <Text style={[styles.statRowVal, { color: colors.text }]}>{links.filter(item => !item.deleted).length} links</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textSecondary }]}>Password Vault Entries</Text>
              <Text style={[styles.statRowVal, { color: colors.text }]}>{passwords.filter(item => !item.deleted).length} entries</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Sparkles size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage Space Optimizer</Text>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Largest Files (Top 3)</Text>
          {(() => {
            const largest = [...files]
              .filter(item => !item.deleted)
              .sort((left, right) => (right.compressedFileSize || right.fileSize || right.originalFileSize || 0) - (left.compressedFileSize || left.fileSize || left.originalFileSize || 0))
              .slice(0, 3);

            if (largest.length === 0) {
              return <Text style={[styles.noReportText, { color: colors.textSecondary }]}>No files uploaded yet.</Text>;
            }

            return largest.map(file => (
              <View key={file._id} style={[styles.reportRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.reportFileName, { color: colors.text }]} numberOfLines={1}>
                  {file.fileName}
                </Text>
                <Text style={[styles.reportFileSize, { color: colors.danger }]}>
                  {formatFileSize(file.compressedFileSize || file.fileSize || file.originalFileSize || 0)}
                </Text>
              </View>
            ));
          })()}

          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>Duplicate Files Found</Text>
          {(() => {
            const activeFiles = files.filter(item => !item.deleted);
            const duplicates = [];
            const seen = {};

            activeFiles.forEach(file => {
              const size = file.compressedFileSize || file.fileSize || file.originalFileSize || 0;
              const key = `${file.fileName.toLowerCase()}_${size}`;
              if (seen[key]) {
                seen[key].push(file);
              } else {
                seen[key] = [file];
              }
            });

            Object.keys(seen).forEach(key => {
              if (seen[key].length > 1) {
                duplicates.push({ key, files: seen[key] });
              }
            });

            if (duplicates.length === 0) {
              return <Text style={[styles.noReportText, { color: colors.textSecondary }]}>No duplicate files detected.</Text>;
            }

            return duplicates.slice(0, 3).map(duplicate => (
              <View key={duplicate.key} style={[styles.dupCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.dupTitle, { color: colors.text }]} numberOfLines={1}>
                  {duplicate.files[0].fileName} ({formatFileSize(duplicate.files[0].compressedFileSize || duplicate.files[0].fileSize || duplicate.files[0].originalFileSize || 0)})
                </Text>
                {duplicate.files.map(file => (
                  <View key={file._id} style={styles.dupItemRow}>
                    <Text style={[styles.dupItemSub, { color: colors.textSecondary }]}>
                      Folder: {folders.find(folder => folder._id === file.folderId)?.folderName || '[Root]'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          'Delete Duplicate?',
                          `Permanently delete "${file.fileName}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                await storageService.deleteItem(Config.COLLECTIONS.FILES, file._id, dbContext, true);
                                Alert.alert('Deleted', 'Duplicate file removed.');
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Trash2 size={12} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ));
          })()}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.trashRowLink} onPress={() => navigation.navigate('Trash')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trash2 size={20} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recycle Bin</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>Open Bin</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 40 }]}>
          <View style={styles.sectionHeader}>
            <Sparkles size={20} color={colors.warning} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Device Maintenance</Text>
          </View>

          <TouchableOpacity
            style={[styles.adminBtn, { backgroundColor: colors.primary + '20', marginBottom: 12 }]}
            onPress={handleSeedTestData}
          >
            <Sparkles size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Seed Test Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminBtn, { backgroundColor: colors.danger + '20' }]}
            onPress={handleClear}
            disabled={loading}
          >
            <Trash2 size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Wipe Local Cache</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusLabelText: {
    fontSize: 12,
  },
  credsToggle: {
    paddingVertical: 6,
  },
  credsToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  credsPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  credsLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  credsValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 10,
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsPanel: {
    paddingHorizontal: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  statRowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statRowVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
  },
  trashRowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  noReportText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  reportFileName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  reportFileSize: {
    fontSize: 12,
    fontWeight: '700',
  },
  dupCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginVertical: 4,
  },
  dupTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  dupItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  dupItemSub: {
    fontSize: 10,
  },
});
