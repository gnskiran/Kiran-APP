import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Folder, MoreVertical, Edit2, Trash2, FolderSync, Copy, Check } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { folderService } from '../services/folderService';
import { formatFileSize } from './FileCard';

export default function FolderCard({
  folder,
  isGridView = false,
  onPress,
  onRename,
  onDelete,
  onMove,
  onCopy,
  onLongPress,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) {
  const { colors } = useContext(ThemeContext);
  const { folders, files } = useContext(DatabaseContext);
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setMenuVisible(!menuVisible);
  };

  const handleAction = (callback) => {
    setMenuVisible(false);
    if (callback) callback();
  };

  // Calculate nested counts recursively
  const stats = folderService.getNestedFolderStats(folder._id, folders, files);

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        isGridView ? styles.gridCard : styles.listCard, 
        {
          backgroundColor: colors.cardBg,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        }
      ]}
      onPress={selectionMode ? onToggleSelect : onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={isGridView ? styles.gridContent : styles.listContent}>
        {/* Folder Icon Badge */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Folder size={isGridView ? 28 : 22} color={colors.primary} />
        </View>

        {/* Directory Info */}
        <View style={isGridView ? styles.gridInfo : styles.listInfo}>
          <Text style={[styles.folderName, { color: colors.text }]} numberOfLines={1}>
            {folder.folderName}
          </Text>
          <Text style={[styles.folderCounts, { color: colors.textSecondary }]}>
            {stats.subfoldersCount} flds • {stats.filesCount} files ({formatFileSize(stats.totalSize)})
          </Text>
        </View>

        {/* Action Toggle Button */}
        {selectionMode ? (
          <TouchableOpacity style={[styles.selectButton, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]} onPress={onToggleSelect}>
            {selected ? <Check size={14} color="#FFFFFF" /> : null}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <MoreVertical size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Cross-platform Context Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>Folder Actions</Text>
            
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => handleAction(onRename)}
            >
              <Edit2 size={16} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => handleAction(onMove)}
            >
              <FolderSync size={16} color={colors.warning} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Move Directory</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => handleAction(onCopy)}
            >
              <Copy size={16} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Copy Folder Tree</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleAction(onDelete)}
            >
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gridCard: {
    flex: 1,
    minWidth: '45%',
    height: 110,
  },
  listCard: {
    width: '100%',
    marginVertical: 4,
  },
  gridContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  listContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInfo: {
    marginTop: 10,
    paddingRight: 16,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  folderName: {
    fontSize: 15,
    fontWeight: '700',
  },
  folderCounts: {
    fontSize: 11,
    marginTop: 2,
  },
  menuButton: {
    position: 'absolute',
    right: 0,
    top: 4,
    padding: 6,
  },
  selectButton: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDropdown: {
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
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  }
});
