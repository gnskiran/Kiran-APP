import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { FolderPlus } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function CreateFolderModal({ visible, folderToEdit = null, onSave, onCancel }) {
  const { colors } = useContext(ThemeContext);
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    if (folderToEdit) {
      // Remove any emojis during editing for clean rename input
      setFolderName(folderToEdit.folderName.replace(/[📁💼🎨📄]/g, '').trim());
    } else {
      setFolderName('');
    }
  }, [folderToEdit, visible]);

  const handleSave = () => {
    const trimmed = folderName.trim();
    if (!trimmed) {
      Alert.alert('Required field ⚠️', 'Folder name cannot be blank.');
      return;
    }
    // Prefix standard default folder emoji if not already present
    const prefix = folderToEdit ? '' : '📁 ';
    onSave(prefix + trimmed);
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
            <FolderPlus size={24} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {folderToEdit ? 'Rename Folder' : 'New Folder'}
          </Text>

          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Folder name"
            placeholderTextColor={colors.textSecondary}
            value={folderName}
            onChangeText={setFolderName}
            autoFocus
            maxLength={32}
            selectTextOnFocus
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
    alignItems: 'center',
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
  input: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
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
