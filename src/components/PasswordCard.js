import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { Key, Eye, EyeOff, Copy, Edit2, Trash2, MoreVertical, ExternalLink, AlertTriangle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { ThemeContext } from '../context/ThemeContext';
import { linkService } from '../services/linkService';

const getCategoryColor = (cat, colors) => {
  switch (cat) {
    case 'Work': return colors.primary;
    case 'Finance': return colors.accent;
    case 'Social': return '#8B5CF6';
    case 'Other': return colors.warning;
    case 'Personal':
    default:
      return colors.textSecondary;
  }
};

export default function PasswordCard({ entry, onEdit, onDelete }) {
  const { colors } = useContext(ThemeContext);
  const [showPassword, setShowPassword] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopy = async (text, label) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied! 📋', `${label} successfully copied to clipboard.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLaunchWebsite = () => {
    if (entry.website) {
      linkService.openUrl(entry.website);
    }
  };

  const isExpired = () => {
    if (!entry.updatedAt) return false;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return new Date(entry.updatedAt) < ninetyDaysAgo;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        {entry.website && !imgError ? (
          <Image
            source={{ uri: `https://www.google.com/s2/favicons?sz=64&domain=${entry.website.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}` }}
            style={styles.avatarImage}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Key size={20} color={colors.primary} />
          </View>
        )}
        
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {entry.title}
            </Text>
            <View style={[styles.catBadge, { backgroundColor: getCategoryColor(entry.category, colors) }]}>
              <Text style={styles.catBadgeText}>{entry.category || 'Personal'}</Text>
            </View>
          </View>
          {entry.website ? (
            <TouchableOpacity onPress={handleLaunchWebsite} style={styles.websiteLink}>
              <Text style={[styles.websiteText, { color: colors.primary }]} numberOfLines={1}>
                {entry.website}
              </Text>
              <ExternalLink size={10} color={colors.primary} style={styles.linkIcon} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.subText, { color: colors.textSecondary }]}>No website listed</Text>
          )}
        </View>

        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <MoreVertical size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Detail Fields Area */}
      <View style={[styles.detailsContainer, { backgroundColor: colors.background }]}>
        {/* Username Row */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldInfo}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Username</Text>
            <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
              {entry.username}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={() => handleCopy(entry.username, 'Username')}
          >
            <Copy size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Password Row */}
        <View style={[styles.fieldRow, { marginTop: 10 }]}>
          <View style={styles.fieldInfo}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Password</Text>
            <Text style={[styles.fieldValue, { color: colors.text, letterSpacing: showPassword ? 0 : 3 }]} numberOfLines={1}>
              {showPassword ? entry.password : '••••••••••••'}
            </Text>
          </View>
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              style={styles.actionIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={16} color={colors.textSecondary} />
              ) : (
                <Eye size={16} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.copyButton} 
              onPress={() => handleCopy(entry.password, 'Password')}
            >
              <Copy size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Expiry Warning Warning */}
      {isExpired() && (
        <View style={[styles.expiryAlert, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '40' }]}>
          <AlertTriangle size={14} color={colors.danger} style={{ marginRight: 6 }} />
          <Text style={[styles.expiryAlertText, { color: colors.danger }]}>
            Rotation alert: Password is 90+ days old. Update recommended.
          </Text>
        </View>
      )}

      {/* Notes section if present */}
      {entry.notes ? (
        <View style={styles.notesContainer}>
          <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
            💡 <Text style={{ fontStyle: 'italic' }}>{entry.notes}</Text>
          </Text>
        </View>
      ) : null}

      {/* Modal Dropdown Actions */}
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
            <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>Credential Actions</Text>
            
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => {
                setMenuVisible(false);
                if (onEdit) onEdit();
              }}
            >
              <Edit2 size={16} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                if (onDelete) onDelete();
              }}
            >
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Entry</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  websiteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkIcon: {
    marginLeft: 4,
  },
  subText: {
    fontSize: 11,
    marginTop: 2,
  },
  menuButton: {
    padding: 6,
  },
  detailsContainer: {
    borderRadius: 10,
    padding: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInfo: {
    flex: 1,
    paddingRight: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    padding: 8,
    marginRight: 4,
  },
  copyButton: {
    padding: 8,
  },
  notesContainer: {
    marginTop: 10,
    paddingHorizontal: 4,
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
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  expiryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  expiryAlertText: {
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  }
});
