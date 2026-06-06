import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { ClipboardList, Calendar, Bell, Folder, Info } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { Config } from '../constants/Config';

export default function CreateTaskModal({ visible, taskToEdit = null, onSave, onCancel }) {
  const { colors } = useContext(ThemeContext);
  const { folders } = useContext(DatabaseContext);

  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [relatedFolderId, setRelatedFolderId] = useState('');
  const [folderSelectorVisible, setFolderSelectorVisible] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTaskName(taskToEdit.taskName);
      setTaskDescription(taskToEdit.taskDescription || '');
      setPriority(taskToEdit.priority || 'Medium');
      setDueDate(taskToEdit.dueDate || '');
      setReminderEnabled(taskToEdit.reminderEnabled ?? false);
      
      let rDate = taskToEdit.reminderDate || '';
      let rTime = taskToEdit.reminderTime || '';
      if (!rDate && !rTime && taskToEdit.reminderDateTime) {
        const parts = taskToEdit.reminderDateTime.trim().split(' ');
        if (parts.length === 2) {
          rDate = parts[0];
          rTime = parts[1];
        } else if (parts.length === 1 && parts[0].includes('-')) {
          rDate = parts[0];
        }
      }
      setReminderDate(rDate);
      setReminderTime(rTime);
      
      setRelatedFolderId(taskToEdit.relatedFolderId || '');
    } else {
      setTaskName('');
      setTaskDescription('');
      setPriority('Medium');
      setDueDate('');
      setReminderEnabled(false);
      setReminderDate('');
      setReminderTime('');
      setRelatedFolderId('');
    }
  }, [taskToEdit, visible]);

  // Quick Date Helpers
  const setQuickDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setDueDate(dateStr);

    if (reminderEnabled) {
      setReminderDate(dateStr);
      setReminderTime('09:00');
    }
  };


  const handleSave = () => {
    const nameTrim = taskName.trim();
    if (!nameTrim) {
      Alert.alert('Required field ⚠️', 'Task Name is required.');
      return;
    }

    // Validate due date if entered
    if (dueDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
      Alert.alert('Invalid Date Format ⚠️', 'Due Date must be in YYYY-MM-DD format.');
      return;
    }

    // Validate reminder date and time if reminder enabled
    let finalReminderDate = reminderDate.trim();
    let finalReminderTime = reminderTime.trim();

    if (reminderEnabled) {
      if (!finalReminderDate && !finalReminderTime) {
        finalReminderDate = dueDate.trim() || Config.getLocalDateString();
        finalReminderTime = '09:00';
      } else {
        if (!finalReminderDate) {
          finalReminderDate = dueDate.trim() || Config.getLocalDateString();
        }
        if (!finalReminderTime) {
          finalReminderTime = '09:00';
        }
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(finalReminderDate)) {
        Alert.alert('Invalid Date Format ⚠️', 'Reminder Date must be in YYYY-MM-DD format.');
        return;
      }
      if (!/^\d{2}:\d{2}$/.test(finalReminderTime)) {
        Alert.alert('Invalid Time Format ⚠️', 'Reminder Time must be in HH:MM format (24-hour).');
        return;
      }
    }

    onSave({
      taskName: nameTrim,
      taskDescription: taskDescription.trim(),
      priority,
      status: taskToEdit ? taskToEdit.status : 'Pending',
      createdDate: taskToEdit ? taskToEdit.createdDate : Config.getLocalDateString(),
      dueDate: dueDate.trim(),
      reminderEnabled,
      reminderDateTime: reminderEnabled ? `${finalReminderDate} ${finalReminderTime}` : '',
      reminderDate: reminderEnabled ? finalReminderDate : '',
      reminderTime: reminderEnabled ? finalReminderTime : '',
      relatedFolderId,
    });
  };

  // Set default reminder time if toggled on and empty
  const handleToggleReminder = (value) => {
    setReminderEnabled(value);
    if (value && !reminderDate && !reminderTime) {
      const targetDate = dueDate.trim() || Config.getLocalDateString();
      setReminderDate(targetDate);
      setReminderTime('09:00');
    }
  };

  const getFolderName = (id) => {
    const folder = folders.find(f => f._id === id);
    return folder ? folder.folderName : 'No Folder Attached';
  };

  const activeFolders = folders.filter(f => !f.deleted);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <ClipboardList size={24} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {taskToEdit ? 'Edit Task' : 'Create Task'}
            </Text>

            {/* Task Name */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Task Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Complete Kiran Drive"
              placeholderTextColor={colors.textSecondary}
              value={taskName}
              onChangeText={setTaskName}
            />

            {/* Task Description */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Task Description / Notes</Text>
            <TextInput
              style={[styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Add details, notes, or web links..."
              placeholderTextColor={colors.textSecondary}
              value={taskDescription}
              onChangeText={setTaskDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Priority Selection */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {['Low', 'Medium', 'High', 'Critical'].map((p) => {
                const isSelected = priority === p;
                let activeColor = colors.textSecondary;
                let activeBg = colors.background;

                if (isSelected) {
                  if (p === 'Low') { activeColor = colors.textSecondary; activeBg = colors.border; }
                  else if (p === 'Medium') { activeColor = '#FFFFFF'; activeBg = colors.primary; }
                  else if (p === 'High') { activeColor = '#FFFFFF'; activeBg = colors.warning; }
                  else if (p === 'Critical') { activeColor = '#FFFFFF'; activeBg = colors.danger; }
                }

                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityButton, { backgroundColor: activeBg, borderColor: colors.border }]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.priorityText, { color: isSelected ? activeColor : colors.textSecondary, fontWeight: isSelected ? '700' : '500' }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Due Date */}
            <View style={styles.sectionHeader}>
              <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Due Date (YYYY-MM-DD)</Text>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="YYYY-MM-DD (Optional)"
              placeholderTextColor={colors.textSecondary}
              value={dueDate}
              onChangeText={setDueDate}
            />

            {/* Quick Date Helpers */}
            <View style={styles.helperRow}>
              <TouchableOpacity style={[styles.helperButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setQuickDate(0)}>
                <Text style={[styles.helperText, { color: colors.text }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.helperButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setQuickDate(1)}>
                <Text style={[styles.helperText, { color: colors.text }]}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.helperButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setQuickDate(3)}>
                <Text style={[styles.helperText, { color: colors.text }]}>In 3 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.helperButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setQuickDate(7)}>
                <Text style={[styles.helperText, { color: colors.text }]}>Next Week</Text>
              </TouchableOpacity>
            </View>

            {/* Reminder Toggle */}
            <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
              <View style={styles.switchLabelRow}>
                <Bell size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Enable Reminder</Text>
                  <Text style={[styles.switchSubLabel, { color: colors.textSecondary }]}>Plan future notification triggers</Text>
                </View>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                thumbColor={reminderEnabled ? colors.primary : '#94A3B8'}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
              />
            </View>

            {/* Reminder Date & Time Inputs */}
            {reminderEnabled && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 14 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reminder Date</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 0 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    value={reminderDate}
                    onChangeText={setReminderDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reminder Time</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 0 }]}
                    placeholder="HH:MM (24h)"
                    placeholderTextColor={colors.textSecondary}
                    value={reminderTime}
                    onChangeText={setReminderTime}
                  />
                </View>
              </View>
            )}

            {/* Related Folder Picker */}
            <View style={[styles.switchRow, { borderTopColor: colors.border, borderBottomColor: colors.border, borderBottomWidth: 0.5, paddingBottom: 16, marginBottom: 20 }]}>
              <View style={styles.switchLabelRow}>
                <Folder size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Attach to Folder</Text>
                  <Text style={[styles.switchSubLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {relatedFolderId ? getFolderName(relatedFolderId) : 'No folder linked'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.selectFolderBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setFolderSelectorVisible(true)}
              >
                <Text style={styles.selectFolderBtnText}>Choose</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel/Save Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>

      {/* Folder Selection Mini-Modal */}
      <Modal
        visible={folderSelectorVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFolderSelectorVisible(false)}
      >
        <TouchableOpacity
          style={styles.folderOverlay}
          activeOpacity={1}
          onPress={() => setFolderSelectorVisible(false)}
        >
          <View style={[styles.folderContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.folderTitle, { color: colors.text }]}>Link Folder</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              <TouchableOpacity
                style={[styles.folderItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setRelatedFolderId('');
                  setFolderSelectorVisible(false);
                }}
              >
                <Text style={[styles.folderItemText, { color: colors.danger, fontWeight: '700' }]}>None (Remove attachment)</Text>
              </TouchableOpacity>

              {activeFolders.length === 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No active folders available.</Text>
                </View>
              ) : (
                activeFolders.map(folder => (
                  <TouchableOpacity
                    key={folder._id}
                    style={[styles.folderItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setRelatedFolderId(folder._id);
                      setFolderSelectorVisible(false);
                    }}
                  >
                    <Folder size={16} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.folderItemText, { color: colors.text }]} numberOfLines={1}>
                      {folder.folderName}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 14,
  },
  notesInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 14,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  priorityButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  priorityText: {
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  helperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  helperButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    paddingVertical: 14,
  },
  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSubLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    maxWidth: 200,
  },
  selectFolderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  selectFolderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    elevation: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  folderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderContainer: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  folderTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  folderItemText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
