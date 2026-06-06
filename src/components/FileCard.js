import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { FileText, FileSpreadsheet, FileCode, FileArchive, Eye, Trash2, Edit2, FolderSync, MoreVertical, File, Sparkles } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Config } from '../constants/Config';

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileMeta(fileName, fileType = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (Config.FILE_CATEGORIES.IMAGE.includes(ext) || fileType.startsWith('image/')) {
    return { type: 'image', icon: null, color: '#3B82F6', bgColor: '#DBEAFE' };
  }
  if (Config.FILE_CATEGORIES.PDF.includes(ext) || fileType === 'application/pdf') {
    return { type: 'pdf', icon: FileText, color: '#EF4444', bgColor: '#FEE2E2' };
  }
  if (Config.FILE_CATEGORIES.WORD.includes(ext) || fileType.includes('word') || fileType.includes('officedocument.wordprocessingml')) {
    return { type: 'word', icon: FileText, color: '#2563EB', bgColor: '#DBEAFE' };
  }
  if (Config.FILE_CATEGORIES.EXCEL.includes(ext) || fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv')) {
    return { type: 'excel', icon: FileSpreadsheet, color: '#10B981', bgColor: '#D1FAE5' };
  }
  if (Config.FILE_CATEGORIES.ZIP.includes(ext) || fileType.includes('zip') || fileType.includes('compressed')) {
    return { type: 'zip', icon: FileArchive, color: '#8B5CF6', bgColor: '#EDE9FE' };
  }
  if (Config.FILE_CATEGORIES.TEXT.includes(ext) || fileType.startsWith('text/')) {
    return { type: 'text', icon: FileCode, color: '#6B7280', bgColor: '#F3F4F6' };
  }
  
  return { type: 'unknown', icon: File, color: '#94A3B8', bgColor: '#F1F5F9' };
}

export default function FileCard({ file, isGridView = false, onPress, onRename, onDelete, onMove }) {
  const { colors } = useContext(ThemeContext);
  const [menuVisible, setMenuVisible] = useState(false);

  const fileMeta = getFileMeta(file.fileName, file.fileType);
  
  // Size metrics calculations
  const originalSize = file.originalFileSize || file.fileSize || 0;
  const compressedSize = file.compressedFileSize || file.fileSize || 0;
  const savedBytes = originalSize - compressedSize;
  const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;
  
  const toggleMenu = (e) => {
    e.stopPropagation();
    setMenuVisible(!menuVisible);
  };

  const handleAction = (callback) => {
    setMenuVisible(false);
    if (callback) callback();
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        isGridView ? styles.gridCard : styles.listCard, 
        { backgroundColor: colors.cardBg, borderColor: colors.border }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={isGridView ? styles.gridContent : styles.listContent}>
        {/* Render Thumbnail Preview if Image, else render file type Icon */}
        {fileMeta.type === 'image' && file.thumbnailUrl ? (
          <Image 
            source={{ uri: file.thumbnailUrl }} 
            style={[styles.thumbnail, isGridView ? styles.gridThumbnail : styles.listThumbnail]} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: fileMeta.bgColor }, isGridView ? styles.gridIconContainer : styles.listIconContainer]}>
            {fileMeta.icon && <fileMeta.icon size={isGridView ? 32 : 22} color={fileMeta.color} />}
          </View>
        )}

        {/* File details panel */}
        <View style={isGridView ? styles.gridInfo : styles.listInfo}>
          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
            {file.fileName}
          </Text>
          <View style={styles.metaRow}>
            {/* Display compressed size and saved percentage savings */}
            <Text style={[styles.fileMetaText, { color: colors.textSecondary }]}>
              {formatFileSize(compressedSize)}
            </Text>
            {savedPercent > 0 && (
              <View style={styles.savingsBadge}>
                <Sparkles size={8} color={colors.accent} style={{ marginRight: 2 }} />
                <Text style={[styles.savingsText, { color: colors.accent }]}>-{savedPercent}%</Text>
              </View>
            )}
            {!isGridView && (
              <Text style={[styles.dotDivider, { color: colors.textSecondary }]}>•</Text>
            )}
            <Text style={[styles.fileMetaText, { color: colors.textSecondary }]}>
              {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Action contextual menu button */}
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <MoreVertical size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Item Context Menu Overlay Modal */}
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
            <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>File Actions</Text>
            
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => handleAction(onPress)}
            >
              <Eye size={16} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Open / Preview</Text>
            </TouchableOpacity>

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
              <Text style={[styles.menuItemText, { color: colors.text }]}>Move File</Text>
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
    padding: 10,
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
    height: 160,
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
  thumbnail: {
    borderRadius: 8,
  },
  gridThumbnail: {
    width: '100%',
    height: 80,
  },
  listThumbnail: {
    width: 44,
    height: 44,
  },
  iconContainer: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconContainer: {
    width: '100%',
    height: 80,
  },
  listIconContainer: {
    width: 44,
    height: 44,
  },
  gridInfo: {
    marginTop: 8,
    paddingRight: 16,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  fileMetaText: {
    fontSize: 11,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
    marginLeft: 6,
  },
  savingsText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dotDivider: {
    marginHorizontal: 6,
    fontSize: 11,
  },
  menuButton: {
    position: 'absolute',
    right: 0,
    top: 4,
    padding: 6,
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
