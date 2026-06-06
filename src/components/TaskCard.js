import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MoreVertical, Edit2, Trash2, Copy, Calendar, Bell, Folder, AlertTriangle, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { taskService } from '../services/taskService';
import { Config } from '../constants/Config';

export default function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  navigation,
  onLongPress,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { folders } = useContext(DatabaseContext);

  const [menuVisible, setMenuVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleStatusCycle = async () => {
    try {
      await taskService.cycleStatus(task, dbContext);
    } catch (e) {
      console.error('Failed to cycle status:', e);
    }
  };

  const handleDuplicate = async () => {
    setMenuVisible(false);
    try {
      await taskService.duplicateTask(task, dbContext);
    } catch (e) {
      console.error('Failed to duplicate task:', e);
    }
  };

  // Check if task is overdue
  const isOverdue = () => {
    if (task.status === 'Overdue') return true;
    if (!task.dueDate || task.status === 'Completed') return false;
    
    try {
      const todayStr = Config.getLocalDateString();
      return task.dueDate < todayStr;
    } catch (e) {
      return false;
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Critical': return colors.danger;
      case 'High': return colors.warning;
      case 'Medium': return colors.primary;
      case 'Low':
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Completed': return colors.accent;
      case 'In Progress': return colors.primary;
      case 'Overdue': return colors.danger;
      case 'Pending':
      default:
        return colors.warning;
    }
  };

  const getFolderName = (folderId) => {
    const folder = folders.find(f => f._id === folderId);
    return folder ? folder.folderName : 'Attached Folder';
  };

  const handleFolderPress = () => {
    if (task.relatedFolderId && navigation) {
      navigation.navigate('AppHome', {
        screen: 'FoldersTab',
        params: { folderId: task.relatedFolderId }
      });
    }
  };

  const formattedDueDate = () => {
    if (!task.dueDate) return '';
    try {
      const parts = task.dueDate.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return task.dueDate;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: selected ? colors.primary : (isOverdue() ? colors.danger : colors.border),
          borderWidth: selected ? 2 : (isOverdue() ? 1.5 : 1),
        },
      ]}
      onPress={selectionMode ? onToggleSelect : () => setExpanded(!expanded)}
      onLongPress={onLongPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
            {task.taskName}
          </Text>
          
          <View style={styles.badgeRow}>
            {/* Priority Badge */}
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '15', borderColor: getPriorityColor(task.priority) }]}>
              <Text style={[styles.priorityBadgeText, { color: getPriorityColor(task.priority) }]}>
                {task.priority}
              </Text>
            </View>

            {/* Status Button/Badge */}
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}
              onPress={selectionMode ? onToggleSelect : handleStatusCycle}
              activeOpacity={0.8}
            >
              <Text style={styles.statusBadgeText}>{task.status}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectionMode ? (
          <TouchableOpacity 
            style={[styles.selectButton, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]} 
            onPress={onToggleSelect}
          >
            {selected ? <Check size={14} color="#FFFFFF" /> : null}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
            <MoreVertical size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Description text */}
      {task.taskDescription ? (
        <View style={styles.descWrapper}>
          <Text
            style={[styles.descText, { color: colors.textSecondary }]}
            numberOfLines={expanded ? undefined : 2}
          >
            {task.taskDescription}
          </Text>
          {task.taskDescription.length > 80 && (
            <View style={styles.expandRow}>
              {expanded ? (
                <ChevronUp size={14} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={14} color={colors.textSecondary} />
              )}
            </View>
          )}
        </View>
      ) : null}

      {/* Footer Meta Row */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        {/* Due date and Overdue indicator */}
        {task.dueDate ? (
          <View style={styles.metaItem}>
            {isOverdue() ? (
              <AlertTriangle size={13} color={colors.danger} style={{ marginRight: 4 }} />
            ) : (
              <Calendar size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            )}
            <Text
              style={[
                styles.metaText,
                { color: isOverdue() ? colors.danger : colors.textSecondary, fontWeight: isOverdue() ? '700' : '500' }
              ]}
            >
              {isOverdue() ? `Overdue: ${formattedDueDate()}` : `Due: ${formattedDueDate()}`}
            </Text>
          </View>
        ) : (
          <View style={styles.metaItem}>
            <Calendar size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>No due date</Text>
          </View>
        )}

        {/* Reminder indicator */}
        {task.reminderEnabled && task.reminderDateTime && (
          <View style={[styles.metaItem, { marginLeft: 12 }]}>
            <Bell size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.primary, fontWeight: '600' }]} numberOfLines={1}>
              {task.reminderDateTime.split(' ')[1] || 'Alert'}
            </Text>
          </View>
        )}

        {/* Folder link */}
        {task.relatedFolderId ? (
          <TouchableOpacity
            style={[styles.metaItem, styles.folderLink, { backgroundColor: colors.primaryLight }]}
            onPress={handleFolderPress}
            activeOpacity={0.7}
          >
            <Folder size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
              {getFolderName(task.relatedFolderId)}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Task Dropdown Actions Menu */}
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
            <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>Task Actions</Text>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setMenuVisible(false);
                if (onEdit) onEdit();
              }}
            >
              <Edit2 size={16} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={handleDuplicate}
            >
              <Copy size={16} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Duplicate Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                if (onDelete) onDelete();
              }}
            >
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Task</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  priorityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    marginRight: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  menuButton: {
    padding: 4,
    marginTop: -2,
  },
  descWrapper: {
    marginTop: 10,
    paddingRight: 6,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  expandRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  folderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 'auto',
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
    fontSize: 11,
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
  selectButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
