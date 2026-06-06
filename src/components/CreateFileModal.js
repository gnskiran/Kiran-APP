import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Upload, FilePlus, Edit2 } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function CreateFileModal({ visible, fileToEdit = null, onUploadPick, onCreateTextFile, onRenameSave, onCancel }) {
  const { colors } = useContext(ThemeContext);
  const [fileName, setFileName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [mode, setMode] = useState('picker'); // 'picker' | 'textEditor' | 'rename'

  useEffect(() => {
    if (fileToEdit) {
      setMode('rename');
      setFileName(fileToEdit.fileName);
    } else {
      setMode('picker');
      setFileName('');
      setTextContent('');
    }
  }, [fileToEdit, visible]);

  const handleCreateText = () => {
    const nameTrim = fileName.trim();
    if (!nameTrim) {
      Alert.alert('Required field ⚠️', 'Please provide a file name.');
      return;
    }
    const finalName = nameTrim.endsWith('.txt') ? nameTrim : nameTrim + '.txt';
    onCreateTextFile(finalName, textContent);
  };

  const handleRename = () => {
    const nameTrim = fileName.trim();
    if (!nameTrim) {
      Alert.alert('Required field ⚠️', 'File name cannot be blank.');
      return;
    }
    onRenameSave(nameTrim);
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
          {mode === 'picker' && (
            <View style={styles.content}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                <Upload size={24} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Add Document</Text>
              
              <TouchableOpacity 
                style={[styles.actionOption, { backgroundColor: colors.primary }]}
                onPress={onUploadPick}
              >
                <Upload size={18} color="#FFFFFF" />
                <Text style={styles.actionText}>Upload from Device</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionOption, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => setMode('textEditor')}
              >
                <FilePlus size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.text }]}>Create Text Document</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.cancelButtonFull, { borderColor: colors.border }]} onPress={onCancel}>
                <Text style={[styles.cancelText, { color: colors.text }]}>Close Dialog</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'textEditor' && (
            <ScrollView contentContainerStyle={styles.contentScroll} style={{ width: '100%' }}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight, alignSelf: 'center' }]}>
                <FilePlus size={24} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>New Text File</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>File Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="note.txt"
                placeholderTextColor={colors.textSecondary}
                value={fileName}
                onChangeText={setFileName}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Content</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Write your note contents here..."
                placeholderTextColor={colors.textSecondary}
                value={textContent}
                onChangeText={setTextContent}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton, { borderColor: colors.border }]} 
                  onPress={() => setMode('picker')}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]} 
                  onPress={handleCreateText}
                >
                  <Text style={styles.saveText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {mode === 'rename' && (
            <View style={styles.content}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                <Edit2 size={24} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Rename Document</Text>

              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Document name"
                placeholderTextColor={colors.textSecondary}
                value={fileName}
                onChangeText={setFileName}
                autoFocus
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
                  onPress={handleRename}
                >
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  contentScroll: {
    width: '100%',
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
    marginBottom: 20,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: 12,
    marginVertical: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 10,
  },
  cancelButtonFull: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
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
