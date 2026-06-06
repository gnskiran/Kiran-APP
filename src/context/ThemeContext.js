import React, { createContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import { Colors } from '../constants/Colors';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('system'); // 'light' | 'dark' | 'system'
  const [activeTheme, setActiveTheme] = useState('light'); // 'light' | 'dark'

  useEffect(() => {
    // Load initial theme from storage
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(Config.STORAGE_KEYS.THEME);
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    // Determine active colors based on themeMode
    if (themeMode === 'system') {
      const colorScheme = Appearance.getColorScheme();
      setActiveTheme(colorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setActiveTheme(themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    // Listen to device system theme shifts
    if (themeMode !== 'system') return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setActiveTheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => subscription.remove();
  }, [themeMode]);

  const updateThemeMode = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.THEME, mode);
    } catch (error) {
      console.error("Failed to save theme mode:", error);
    }
  };

  const isDark = activeTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ themeMode, activeTheme, colors, isDark, updateThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
