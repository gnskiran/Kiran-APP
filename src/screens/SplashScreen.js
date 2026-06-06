import React, { useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Cloud } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function SplashScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run animations sequentially
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false, // width animation requires layout
      })
    ]).start();

    // Automatical redirect after splash sequence completes
    const timer = setTimeout(() => {
      navigation.replace('AppHome');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, scaleAnim, fadeAnim, progressAnim]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Brand logo container */}
      <Animated.View 
        style={[
          styles.logoWrapper, 
          { 
            opacity: fadeAnim, 
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight }]}>
          <Cloud size={56} color={colors.primary} />
        </View>
        
        {/* App branding */}
        <Text style={[styles.brandText, { color: colors.text }]}>Kiran</Text>
      </Animated.View>

      {/* Progress indicators indicators */}
      <View style={styles.footer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary, width: progressBarWidth }]} />
        </View>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  brandText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    width: '60%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  }
});
