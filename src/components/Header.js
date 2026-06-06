import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Cloud, CloudOff, Settings, Sun, Moon, Sparkles, FolderOpen, AlignLeft } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import FolderTreeView from './FolderTreeView';

export default function Header({ title, breadcrumbs = [], onBreadcrumbPress }) {
  const { colors, isDark, updateThemeMode } = useContext(ThemeContext);
  const { isConnected, folders } = useContext(DatabaseContext);
  const navigation = useNavigation();

  // Collapsible Notion Tree visibility state
  const [treeVisible, setTreeVisible] = useState(false);

  const toggleTheme = () => {
    updateThemeMode(isDark ? 'light' : 'dark');
  };

  const handleFolderSelect = (folderId) => {
    setTreeVisible(false);
    if (onBreadcrumbPress) {
      onBreadcrumbPress(folderId);
    } else {
      // If header is loaded on another screen, navigate to FoldersTab
      navigation.navigate('AppHome', { screen: 'FoldersTab', params: { folderId } });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.topRow}>
        <TouchableOpacity 
          style={styles.logoContainer}
          onPress={() => navigation.navigate('AppHome', { screen: 'HomeTab' })}
        >
          <Text style={[styles.logoText, { color: colors.text }]}>Kiran</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          {/* Connection Status Indicator */}
          <View style={[styles.statusBadge, { backgroundColor: isConnected ? colors.accentLight : colors.border }]}>
            {isConnected ? (
              <Cloud size={14} color={colors.accent} />
            ) : (
              <CloudOff size={14} color={colors.textSecondary} />
            )}
            <Text style={[styles.statusText, { color: isConnected ? colors.accent : colors.textSecondary }]}>
              {isConnected ? 'Cloud Connected' : 'Local Cache'}
            </Text>
          </View>

          {/* Collapsible tree browser */}
          <TouchableOpacity 
            onPress={() => setTreeVisible(!treeVisible)} 
            style={[styles.iconButton, { backgroundColor: treeVisible ? colors.primaryLight : colors.background }]}
          >
            <AlignLeft size={18} color={treeVisible ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>

          {/* Theme Quick Toggle */}
          <TouchableOpacity onPress={toggleTheme} style={[styles.iconButton, { backgroundColor: colors.background }]}>
            {isDark ? (
              <Sun size={20} color={colors.primary} />
            ) : (
              <Moon size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Settings Quick Access */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')} 
            style={[styles.iconButton, { backgroundColor: colors.background }]}
          >
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible Notion folder tree */}
      {treeVisible && (
        <FolderTreeView
          folders={folders}
          currentFolderId={onBreadcrumbPress ? breadcrumbs[breadcrumbs.length - 1]?._id || null : null}
          onFolderSelect={handleFolderSelect}
        />
      )}

      {/* Render Breadcrumbs Navigation if provided, else standard title */}
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbScroll}
        >
          <TouchableOpacity onPress={() => onBreadcrumbPress(null)} style={styles.crumbButton}>
            <Text style={[styles.crumbText, { color: colors.primary }]}>Home</Text>
          </TouchableOpacity>
          
          {breadcrumbs.map((crumb, idx) => (
            <View key={crumb._id} style={styles.crumbRow}>
              <ChevronRight size={14} color={colors.textSecondary} style={styles.crumbChevron} />
              <TouchableOpacity 
                onPress={() => onBreadcrumbPress(crumb._id)} 
                disabled={idx === breadcrumbs.length - 1}
                style={styles.crumbButton}
              >
                <Text 
                  style={[
                    styles.crumbText, 
                    { 
                      color: idx === breadcrumbs.length - 1 ? colors.text : colors.primary,
                      fontWeight: idx === breadcrumbs.length - 1 ? '600' : '400'
                    }
                  ]}
                  numberOfLines={1}
                >
                  {crumb.folderName.replace(/[📁💼🎨📄]/g, '').trim()}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : title ? (
        <View style={styles.titleRow}>
          <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  titleRow: {
    marginTop: 14,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  breadcrumbScroll: {
    alignItems: 'center',
    paddingTop: 12,
  },
  crumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crumbButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  crumbText: {
    fontSize: 14,
  },
  crumbChevron: {
    marginHorizontal: 4,
  }
});
