import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Link2 } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function CreateLinkModal({ visible, linkToEdit = null, onSave, onCancel }) {
  const { colors } = useContext(ThemeContext);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (linkToEdit) {
      setTitle(linkToEdit.title);
      setUrl(linkToEdit.url);
      setNotes(linkToEdit.notes || '');
    } else {
      setTitle('');
      setUrl('');
      setNotes('');
    }
  }, [linkToEdit, visible]);

  const handleSave = () => {
    const tTrim = title.trim();
    const uTrim = url.trim();

    if (!tTrim || !uTrim) {
      Alert.alert('Required fields ⚠️', 'Title and URL are required.');
      return;
    }

    onSave({
      title: tTrim,
      url: uTrim,
      notes: notes.trim()
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Link2 size={24} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {linkToEdit ? 'Edit Link' : 'Add Web Link'}
          </Text>

          {/* Title Input */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="e.g. Design Inspiration"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          {/* URL Input */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>URL Address</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="https://pinterest.com"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />

          {/* Notes Input */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Add brief details about this web link..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

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
        </View>
      </View>
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
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
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
    marginBottom: 20,
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
  }
});
