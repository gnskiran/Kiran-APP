import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function LoadingSpinner({ message = 'Loading Kiran...' }) {
  const { colors } = useContext(ThemeContext);

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(15, 23, 42, 0.6)' }]}>
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message ? (
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  container: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 160,
  },
  message: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  }
});
