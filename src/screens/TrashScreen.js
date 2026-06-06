import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Trash2, RotateCcw, Folder, File, Link2, Key, ClipboardList } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { linkService } from '../services/linkService';
import { passwordService } from '../services/passwordService';
import { taskService } from '../services/taskService';
import { storageService } from '../services/storageService';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { getFileMeta } from '../components/FileCard';
import { Config } from '../constants/Config';

export default function TrashScreen() {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { folders, files, links, passwords, tasks, refreshData, loading } = dbContext;

  const deletedItems = [
    ...folders.filter(item => item.deleted).map(item => ({ ...item, trashType: 'folder' })),
    ...files.filter(item => item.deleted).map(item => ({ ...item, trashType: 'file' })),
    ...links.filter(item => item.deleted).map(item => ({ ...item, trashType: 'link' })),
    ...passwords.filter(item => item.deleted).map(item => ({ ...item, trashType: 'password' })),
    ...tasks.filter(item => item.deleted).map(item => ({ ...item, trashType: 'task' })),
  ].sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));

  const handleRestore = async (item) => {
    try {
      if (item.trashType === 'folder') {
        await storageService.updateItem(Config.COLLECTIONS.FOLDERS, item._id, { deleted: false }, dbContext);
      } else if (item.trashType === 'file') {
        await storageService.updateItem(Config.COLLECTIONS.FILES, item._id, { deleted: false }, dbContext);
      } else if (item.trashType === 'link') {
        await linkService.updateLink(item._id, { deleted: false }, dbContext);
      } else if (item.trashType === 'task') {
        await taskService.updateTask(item._id, { deleted: false }, dbContext);
      } else {
        await passwordService.updatePassword(item._id, { deleted: false }, dbContext);
      }

      Alert.alert('Restored', `"${item.folderName || item.fileName || item.title || item.taskName}" has been restored.`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePermanentDelete = (item) => {
    const title = item.folderName || item.fileName || item.title || item.taskName;

    Alert.alert(
      'Permanent Delete?',
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const collectionType = item.trashType === 'folder'
                ? Config.COLLECTIONS.FOLDERS
                : item.trashType === 'file'
                  ? Config.COLLECTIONS.FILES
                  : item.trashType === 'link'
                    ? Config.COLLECTIONS.LINKS
                    : item.trashType === 'password'
                      ? Config.COLLECTIONS.PASSWORDS
                      : Config.COLLECTIONS.TASKS;

              await storageService.deleteItem(collectionType, item._id, dbContext, true);
              Alert.alert('Deleted', `"${title}" permanently deleted.`);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (deletedItems.length === 0) {
      return;
    }

    Alert.alert(
      'Empty Recycle Bin?',
      'This will permanently delete all soft-deleted folders, files, bookmarks, passwords, and tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const item of deletedItems) {
                const collectionType = item.trashType === 'folder'
                  ? Config.COLLECTIONS.FOLDERS
                  : item.trashType === 'file'
                    ? Config.COLLECTIONS.FILES
                    : item.trashType === 'link'
                      ? Config.COLLECTIONS.LINKS
                      : item.trashType === 'password'
                        ? Config.COLLECTIONS.PASSWORDS
                        : Config.COLLECTIONS.TASKS;
                await storageService.deleteItem(collectionType, item._id, dbContext, true);
              }

              Alert.alert('Recycle Bin Emptied', 'All trashed items have been removed.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderTrashIcon = (type, fileMeta) => {
    if (type === 'folder') return <Folder size={20} color={colors.primary} />;
    if (type === 'link') return <Link2 size={20} color="#10B981" />;
    if (type === 'password') return <Key size={20} color="#8B5CF6" />;
    if (type === 'task') return <ClipboardList size={20} color={colors.warning} />;
    if (fileMeta?.icon) return <fileMeta.icon size={20} color={fileMeta.color} />;
    return <File size={20} color={colors.textSecondary} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Recycle Bin" />

      {deletedItems.length > 0 && (
        <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.infoBannerText, { color: colors.text }]}>
              Items in the Recycle Bin stay here until you restore them or delete them permanently.
            </Text>
            <TouchableOpacity onPress={handleEmptyTrash} style={styles.emptyBtn}>
              <Trash2 size={12} color={colors.danger} style={{ marginRight: 4 }} />
              <Text style={[styles.emptyBtnText, { color: colors.danger }]}>Empty Recycle Bin Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {deletedItems.length === 0 ? (
        <FlatList
          data={[]}
          contentContainerStyle={{ flexGrow: 1 }}
          onRefresh={refreshData}
          refreshing={loading}
          ListEmptyComponent={(
            <EmptyState
              icon={Trash2}
              title="Recycle Bin is Empty"
              description="Deleted folders, files, passwords, bookmarks, and tasks stay here until you restore or permanently delete them."
            />
          )}
          renderItem={null}
        />
      ) : (
        <FlatList
          data={deletedItems}
          keyExtractor={(item) => item._id}
          onRefresh={refreshData}
          refreshing={loading}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const meta = item.trashType === 'file' ? getFileMeta(item.fileName, item.fileType) : null;
            const title = item.folderName || item.fileName || item.title || item.taskName || 'Untitled';
            const dateString = new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <View style={[styles.trashRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                  {renderTrashIcon(item.trashType, meta)}
                </View>

                <View style={styles.infoBox}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                    Deleted on: {dateString} - {item.trashType.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => handleRestore(item)} style={styles.actionBtn}>
                    <RotateCcw size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePermanentDelete(item)} style={[styles.actionBtn, { marginLeft: 8 }]}>
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  trashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBox: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
  },
});
