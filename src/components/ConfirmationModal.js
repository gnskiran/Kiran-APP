import React, { useContext } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function ConfirmationModal({ visible, title = 'Are you sure?', message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel, isDanger = true }) {
  const { colors } = useContext(ThemeContext);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header Warning Warning */}
          <View style={[styles.iconContainer, { backgroundColor: isDanger ? colors.danger + '20' : colors.primaryLight }]}>
            <AlertTriangle size={28} color={isDanger ? colors.danger : colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          <View style={styles.buttonRow}>
            {/* Cancel Trigger */}
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]} 
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>{cancelLabel}</Text>
            </TouchableOpacity>

            {/* Confirm Trigger */}
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.confirmButton, 
                { backgroundColor: isDanger ? colors.danger : colors.primary }
              ]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
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
  confirmButton: {
    elevation: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  }
});
