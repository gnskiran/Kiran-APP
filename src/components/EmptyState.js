import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, FolderOpen } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function EmptyState({ icon: CustomIcon, title = 'No items found', description = 'Tap the button below to add your first item.', actionLabel, onAction }) {
  const { colors } = useContext(ThemeContext);

  const IconComponent = CustomIcon || FolderOpen;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
        <IconComponent size={36} color={colors.primary} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionLabel && onAction ? (
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Sparkles size={16} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginVertical: 40,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  btnIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  }
});
