import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function FolderTreeView({ folders, currentFolderId, onFolderSelect }) {
  const { colors } = useContext(ThemeContext);
  const [expandedNodes, setExpandedNodes] = useState({});

  const toggleExpand = (folderId, e) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Recursive tree renderer
  const renderTreeNode = (nodes, parentId, level = 0) => {
    const levelNodes = nodes.filter(n => n.parentFolderId === parentId && !n.deleted);
    if (levelNodes.length === 0) return null;

    return levelNodes.map(folder => {
      const isExpanded = !!expandedNodes[folder._id];
      const hasChildren = nodes.some(n => n.parentFolderId === folder._id && !n.deleted);
      const isSelected = currentFolderId === folder._id;

      return (
        <View key={folder._id} style={styles.treeNodeWrapper}>
          <TouchableOpacity
            style={[
              styles.treeNode,
              { 
                paddingLeft: level * 16 + 8,
                backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                borderColor: isSelected ? colors.primary : 'transparent'
              }
            ]}
            onPress={() => onFolderSelect(folder._id)}
            activeOpacity={0.7}
          >
            {/* Collapse / Expand icon */}
            {hasChildren ? (
              <TouchableOpacity onPress={(e) => toggleExpand(folder._id, e)} style={styles.expandIcon}>
                {isExpanded ? (
                  <ChevronDown size={14} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={14} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.expandPlaceholder} />
            )}

            {/* Folder Icon badge */}
            {isSelected ? (
              <FolderOpen size={16} color={colors.primary} style={styles.folderIcon} />
            ) : (
              <Folder size={16} color={colors.textSecondary} style={styles.folderIcon} />
            )}

            {/* Directory label name */}
            <Text 
              style={[
                styles.folderLabel, 
                { 
                  color: isSelected ? colors.primary : colors.text,
                  fontWeight: isSelected ? '700' : '500'
                }
              ]}
              numberOfLines={1}
            >
              {folder.folderName.replace(/[📁💼🎨📄]/g, '').trim()}
            </Text>
          </TouchableOpacity>

          {/* Render subfolders recursively if expanded expanded */}
          {hasChildren && isExpanded && (
            <View style={styles.childrenContainer}>
              {renderTreeNode(nodes, folder._id, level + 1)}
            </View>
          )}
        </View>
      );
    });
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.textSecondary }]}>Notion Collapsible Tree</Text>
      
      {/* Root location selector */}
      <TouchableOpacity
        style={[
          styles.treeNode,
          { 
            paddingLeft: 8,
            backgroundColor: currentFolderId === null ? colors.primaryLight : 'transparent'
          }
        ]}
        onPress={() => onFolderSelect(null)}
      >
        <FolderOpen size={16} color={currentFolderId === null ? colors.primary : colors.textSecondary} style={styles.folderIcon} />
        <Text 
          style={[
            styles.folderLabel, 
            { 
              color: currentFolderId === null ? colors.primary : colors.text,
              fontWeight: currentFolderId === null ? '700' : '600'
            }
          ]}
        >
          [My Drive - Root]
        </Text>
      </TouchableOpacity>

      {/* Render children folders tree */}
      <View style={styles.treeBody}>
        {renderTreeNode(folders, null, 0)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  scrollContent: {
    padding: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  treeNodeWrapper: {
    width: '100%',
  },
  treeNode: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 8,
    marginVertical: 1,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  expandIcon: {
    padding: 6,
    marginRight: 2,
  },
  expandPlaceholder: {
    width: 26,
  },
  folderIcon: {
    marginRight: 8,
  },
  folderLabel: {
    fontSize: 13,
    flex: 1,
  },
  childrenContainer: {
    width: '100%',
  },
  treeBody: {
    marginTop: 2,
  }
});
