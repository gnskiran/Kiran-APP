import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Search, Folder, File, Link2, Key, HelpCircle, ClipboardList } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';
import LinkCard from '../components/LinkCard';
import PasswordCard from '../components/PasswordCard';
import TaskCard from '../components/TaskCard';

export default function SearchScreen({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { folders, files, links, passwords, tasks } = dbContext;

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'folders' | 'files' | 'passwords' | 'links' | 'tasks'

  // Pre-load query from parameter shortcuts if redirected
  useEffect(() => {
    if (route.params?.initialQuery) {
      setQuery(route.params.initialQuery);
    }
  }, [route.params?.initialQuery]);

  // Merge lists and filter based on text query and category pills
  const getSearchResults = () => {
    const activeFolders = folders.filter(f => !f.deleted).map(x => ({ ...x, searchType: 'folder' }));
    const activeFiles = files.filter(f => !f.deleted).map(x => ({ ...x, searchType: 'file' }));
    const activeLinks = links.filter(l => !l.deleted).map(x => ({ ...x, searchType: 'link' }));
    const activePasswords = passwords.filter(p => !p.deleted).map(x => ({ ...x, searchType: 'password' }));
    const activeTasks = tasks.filter(t => !t.deleted).map(x => ({ ...x, searchType: 'task' }));

    let pool = [];
    if (activeCategory === 'all') {
      pool = [...activeFolders, ...activeFiles, ...activeLinks, ...activePasswords, ...activeTasks];
    } else if (activeCategory === 'folders') {
      pool = activeFolders;
    } else if (activeCategory === 'files') {
      pool = activeFiles;
    } else if (activeCategory === 'passwords') {
      pool = activePasswords;
    } else if (activeCategory === 'links') {
      pool = activeLinks;
    } else if (activeCategory === 'tasks') {
      pool = activeTasks;
    }

    if (!query.trim()) return pool;
    const cleanQ = query.toLowerCase().trim();

    return pool.filter(item => {
      const name = (item.folderName || item.fileName || item.title || item.taskName || '').toLowerCase();
      const user = (item.username || '').toLowerCase();
      const web = (item.website || item.url || '').toLowerCase();
      const notes = (item.notes || item.taskDescription || '').toLowerCase();
      const extra = (item.status || item.priority || '').toLowerCase();

      return name.includes(cleanQ) || user.includes(cleanQ) || web.includes(cleanQ) || notes.includes(cleanQ) || extra.includes(cleanQ);
    });
  };

  const results = getSearchResults();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Search Drive" />

      <View style={styles.content}>
        {/* Rounded Input */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search documents, passwords, credentials..."
          onClear={() => setQuery('')}
        />

        {/* Categories horizontal list selector */}
        <View style={styles.pillWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'folders', label: 'Folders' },
              { id: 'files', label: 'Files' },
              { id: 'passwords', label: 'Credentials' },
              { id: 'links', label: 'Bookmarks' },
              { id: 'tasks', label: 'Tasks' }
            ].map(pill => (
              <TouchableOpacity
                key={pill.id}
                style={[
                  styles.pill,
                  {
                    backgroundColor: activeCategory === pill.id ? colors.primary : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setActiveCategory(pill.id)}
              >
                <Text 
                  style={[
                    styles.pillText, 
                    { 
                      color: activeCategory === pill.id ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: activeCategory === pill.id ? '700' : '500'
                    }
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results grid */}
        {results.length === 0 ? (
          <FlatList
            data={[]}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <EmptyState
                icon={Search}
                title="No results found"
                description="Double-check spelling or try switching filters to narrow down details."
              />
            }
            renderItem={null}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              if (item.searchType === 'folder') {
                return (
                  <FolderCard
                    folder={item}
                    onPress={() => navigation.navigate('AppHome', { screen: 'FoldersTab', params: { folderId: item._id } })}
                    onRename={() => {}}
                    onMove={() => {}}
                    onDelete={() => {}}
                  />
                );
              }
              if (item.searchType === 'file') {
                return (
                  <FileCard
                    file={item}
                    onPress={() => navigation.navigate('FileDetails', { file: item })}
                    onRename={() => {}}
                    onMove={() => {}}
                    onDelete={() => {}}
                  />
                );
              }
              if (item.searchType === 'link') {
                return (
                  <LinkCard
                    bookmark={item}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                );
              }
              if (item.searchType === 'password') {
                return (
                  <PasswordCard
                    entry={item}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                );
              }
              if (item.searchType === 'task') {
                return (
                  <TaskCard
                    task={item}
                    onEdit={() => navigation.navigate('AppHome', { screen: 'TasksTab' })}
                    onDelete={async () => {
                      try {
                        const { taskService } = require('../services/taskService');
                        await taskService.deleteTask(item._id, dbContext, false);
                      } catch (e) {
                        console.error('Failed to delete task from search:', e);
                      }
                    }}
                    navigation={navigation}
                  />
                );
              }
              return null;
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pillWrapper: {
    height: 48,
    marginBottom: 8,
  },
  pillsScroll: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  pillText: {
    fontSize: 12,
  },
  list: {
    paddingBottom: 24,
  }
});
