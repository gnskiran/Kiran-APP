import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Link2, ExternalLink, Edit2, Trash2, MoreVertical, Check } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { linkService } from '../services/linkService';

export default function LinkCard({
  bookmark,
  onEdit,
  onDelete,
  onLongPress,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) {
  const { colors } = useContext(ThemeContext);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLaunch = () => {
    linkService.openUrl(bookmark.url);
  };

  const getCleanDomain = (urlString) => {
    try {
      const clean = urlString.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0];
      return clean;
    } catch (e) {
      return urlString;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={selectionMode ? onToggleSelect : undefined}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      <View style={styles.contentRow}>
        {/* Link Icon Globe Badge */}
        <TouchableOpacity 
          style={[styles.avatar, { backgroundColor: colors.primaryLight }]}
          onPress={selectionMode ? onToggleSelect : handleLaunch}
        >
          <Link2 size={20} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <TouchableOpacity onPress={selectionMode ? onToggleSelect : handleLaunch}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {bookmark.title}
            </Text>
            <Text style={[styles.urlText, { color: colors.primary }]} numberOfLines={1}>
              {getCleanDomain(bookmark.url)}
            </Text>
          </TouchableOpacity>
        </View>

        {selectionMode ? (
          <TouchableOpacity style={[styles.selectButton, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]} onPress={onToggleSelect}>
            {selected ? <Check size={14} color="#FFFFFF" /> : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleLaunch} style={[styles.actionIcon, { backgroundColor: colors.background }]}>
              <ExternalLink size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
              <MoreVertical size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Description text */}
      {bookmark.notes ? (
        <View style={styles.notesContainer}>
          <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
            {bookmark.notes}
          </Text>
        </View>
      ) : null}

      {/* Item Context Actions */}
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
            <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>Bookmark Actions</Text>
            
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => {
                setMenuVisible(false);
                if (onEdit) onEdit();
              }}
            >
              <Edit2 size={16} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Link</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                if (onDelete) onDelete();
              }}
            >
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Link</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  urlText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  menuButton: {
    padding: 6,
  },
  selectButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesContainer: {
    marginTop: 8,
    paddingLeft: 52,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
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
