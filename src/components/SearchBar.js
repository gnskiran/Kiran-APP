import React, { useContext } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function SearchBar({ value, onChangeText, placeholder = 'Search files, folders, links...', onClear }) {
  const { colors } = useContext(ThemeContext);

  return (
    <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
      {value ? (
        <TouchableOpacity onPress={onClear || (() => onChangeText(''))} style={styles.clearButton}>
          <X size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    padding: 0, // Reset default padding
  },
  clearButton: {
    padding: 4,
  }
});
