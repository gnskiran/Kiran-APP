import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { Key, Eye, EyeOff, Sparkles, HelpCircle } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { passwordService } from '../services/passwordService';

export default function CreatePasswordModal({ visible, passwordToEdit = null, onSave, onCancel }) {
  const { colors } = useContext(ThemeContext);
  
  // Input fields state
  const [title, setTitle] = useState('');
  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Personal'); // 'Personal' | 'Work' | 'Finance' | 'Social' | 'Other'

  // Password Generator toggles
  const [showPass, setShowPass] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNums, setUseNums] = useState(true);
  const [useSyms, setUseSyms] = useState(true);

  useEffect(() => {
    if (passwordToEdit) {
      setTitle(passwordToEdit.title);
      setWebsite(passwordToEdit.website);
      setUsername(passwordToEdit.username);
      setPassword(passwordToEdit.password);
      setNotes(passwordToEdit.notes || '');
      setCategory(passwordToEdit.category || 'Personal');
      setShowGen(false);
    } else {
      setTitle('');
      setWebsite('');
      setUsername('');
      setPassword('');
      setNotes('');
      setCategory('Personal');
      setShowGen(false);
    }
  }, [passwordToEdit, visible]);

  const handleGenerate = () => {
    const newPass = passwordService.generateSecurePassword({
      length: genLength,
      includeUpper: useUpper,
      includeLower: useLower,
      includeNumbers: useNums,
      includeSymbols: useSyms
    });
    setPassword(newPass);
    setShowPass(true);
  };

  const handleSave = () => {
    const tTrim = title.trim();
    const uTrim = username.trim();
    const pTrim = password.trim();

    if (!tTrim || !uTrim || !pTrim) {
      Alert.alert('Required fields ⚠️', 'Title, username, and password are required fields.');
      return;
    }

    onSave({
      title: tTrim,
      website: website.trim(),
      username: uTrim,
      password: pTrim,
      notes: notes.trim(),
      category
    });
  };

  const strength = passwordService.evaluatePasswordStrength(password);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight, alignSelf: 'center' }]}>
              <Key size={24} color={colors.primary} />
            </View>
            
            <Text style={[styles.titleText, { color: colors.text, textAlign: 'center' }]}>
              {passwordToEdit ? 'Edit Credentials' : 'Add Credentials'}
            </Text>

            {/* Title input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Google Mail"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            {/* Website URL input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Website URL</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="https://gmail.com"
              placeholderTextColor={colors.textSecondary}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Username input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username / Email</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="kiran@gmail.com"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            {/* Category Select Pills */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.categoryPillRow}>
              {['Personal', 'Work', 'Finance', 'Social', 'Other'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: category === cat ? colors.primary : colors.background,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.catPillText,
                    {
                      color: category === cat ? '#FFFFFF' : colors.text,
                      fontWeight: category === cat ? '700' : '500'
                    }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Password input with eye togglers and generate toggles */}
            <View style={styles.passLabelRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              
              <TouchableOpacity onPress={() => setShowGen(!showGen)} style={styles.genToggleBtn}>
                <Sparkles size={12} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.genToggleText, { color: colors.primary }]}>
                  {showGen ? 'Hide Generator' : 'Generate Secure'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.passInputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.passInput, { color: colors.text }]}
                placeholder="Secret key"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                {showPass ? (
                  <EyeOff size={18} color={colors.textSecondary} />
                ) : (
                  <Eye size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Dynamic password strength indicator indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthHeader}>
                  <Text style={[styles.strengthLabel, { color: colors.textSecondary }]}>Password Complexity:</Text>
                  <Text style={[styles.strengthValue, { color: strength.color }]}>{strength.label}</Text>
                </View>
                <View style={styles.strengthTrack}>
                  <View 
                    style={[
                      styles.strengthFill, 
                      { 
                        backgroundColor: strength.color,
                        width: `${Math.max(12, (strength.score / 5) * 100)}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            )}

            {/* Expanding Password Generator Options */}
            {showGen && (
              <View style={[styles.generatorPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.genTitle, { color: colors.text }]}>Generator Config</Text>
                
                {/* Custom Length Input */}
                <View style={styles.genRow}>
                  <Text style={[styles.genRowLabel, { color: colors.text }]}>Key Character Length: {genLength}</Text>
                  <View style={styles.lengthActionRow}>
                    <TouchableOpacity 
                      onPress={() => setGenLength(Math.max(8, genLength - 2))} 
                      style={[styles.lenBtn, { backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.lenBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setGenLength(Math.min(32, genLength + 2))} 
                      style={[styles.lenBtn, { backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.lenBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Option Toggles */}
                <View style={styles.genRow}>
                  <Text style={[styles.genRowSub, { color: colors.textSecondary }]}>Include Capitalized (A-Z)</Text>
                  <Switch value={useUpper} onValueChange={setUseUpper} />
                </View>
                <View style={styles.genRow}>
                  <Text style={[styles.genRowSub, { color: colors.textSecondary }]}>Include Lowercase (a-z)</Text>
                  <Switch value={useLower} onValueChange={setUseLower} />
                </View>
                <View style={styles.genRow}>
                  <Text style={[styles.genRowSub, { color: colors.textSecondary }]}>Include Numeric (0-9)</Text>
                  <Switch value={useNums} onValueChange={setUseNums} />
                </View>
                <View style={styles.genRow}>
                  <Text style={[styles.genRowSub, { color: colors.textSecondary }]}>Include Special (Symbols)</Text>
                  <Switch value={useSyms} onValueChange={setUseSyms} />
                </View>

                <TouchableOpacity 
                  style={[styles.genBtnAction, { backgroundColor: colors.primary }]}
                  onPress={handleGenerate}
                >
                  <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.genBtnActionText}>Generate Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notes Input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Store secure notes, pin codes, or recovery hints..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Dialog Action Buttons */}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 18,
  },
  inputLabel: {
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
  passLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  genToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  genToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  passInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  passInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  eyeBtn: {
    padding: 8,
  },
  strengthContainer: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  strengthValue: {
    fontSize: 10,
    fontWeight: '800',
  },
  strengthTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  generatorPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  genTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  genRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
    marginVertical: 2,
  },
  genRowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  genRowSub: {
    fontSize: 12,
  },
  lengthActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lenBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  lenBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  genBtnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 8,
    marginTop: 10,
  },
  genBtnActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
  },
  categoryPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  catPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  catPillText: {
    fontSize: 11,
  },
});
