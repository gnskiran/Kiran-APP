import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Plus, Link2, Trash2, X } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { linkService } from '../services/linkService';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import LinkCard from '../components/LinkCard';
import CreateLinkModal from '../components/CreateLinkModal';

export default function LinkScreen({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { links, refreshData, loading } = dbContext;

  // Search input query
  const [query, setQuery] = useState('');

  // Modals state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLinkToEdit, setSelectedLinkToEdit] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState([]);

  // Sync edits redirects
  useEffect(() => {
    if (route.params?.linkToEdit) {
      setSelectedLinkToEdit(route.params.linkToEdit);
      setModalVisible(true);
      navigation.setParams({ linkToEdit: null });
    }
  }, [route.params?.linkToEdit]);

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedLinkIds([]);
  };

  const startSelection = (linkId) => {
    setSelectionMode(true);
    setSelectedLinkIds([linkId]);
  };

  const toggleLinkSelection = (linkId) => {
    setSelectionMode(true);
    setSelectedLinkIds((current) => (
      current.includes(linkId)
        ? current.filter(id => id !== linkId)
        : [...current, linkId]
    ));
  };

  const handleBulkDeleteLinks = () => {
    if (selectedLinkIds.length === 0) {
      return;
    }

    const totalSelected = selectedLinkIds.length;
    Alert.alert(
      'Delete Selected Bookmarks?',
      `This will delete ${totalSelected} selected bookmark${totalSelected > 1 ? 's' : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedLinkIds.map(linkId => linkService.deleteLink(linkId, dbContext)));
              clearSelection();
            } catch (error) {
              Alert.alert('Delete Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSave = async (data) => {
    try {
      if (selectedLinkToEdit) {
        await linkService.updateLink(selectedLinkToEdit._id, data, dbContext);
        Alert.alert('Updated 🎉', `Bookmark "${data.title}" successfully updated.`);
      } else {
        await linkService.createLink(data.title, data.url, data.notes, null, dbContext);
        Alert.alert('Saved 🎉', `Bookmark "${data.title}" successfully added.`);
      }
      setModalVisible(false);
      setSelectedLinkToEdit(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (id, title) => {
    Alert.alert(
      'Delete Link? ⚠️',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await linkService.deleteLink(id, dbContext);
          }
        }
      ]
    );
  };

  // Filtered bookmark list based on search query
  const getFiltered = () => {
    const active = links.filter(l => !l.deleted);
    if (!query.trim()) return active;

    const cleanQ = query.toLowerCase().trim();
    return active.filter(l => 
      l.title.toLowerCase().includes(cleanQ) || 
      l.url.toLowerCase().includes(cleanQ) || 
      (l.notes && l.notes.toLowerCase().includes(cleanQ))
    );
  };

  const filteredLinks = getFiltered();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Saved Bookmarks" />

      <View style={styles.content}>
        <View style={[styles.bulkBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {selectionMode ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  const allIds = filteredLinks.map(l => l._id);
                  const isAllSelected = allIds.length > 0 && allIds.every(id => selectedLinkIds.includes(id));
                  if (isAllSelected) {
                    setSelectedLinkIds([]);
                  } else {
                    setSelectedLinkIds(allIds);
                  }
                }}
                style={{ marginRight: 10 }}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                  {filteredLinks.length > 0 && filteredLinks.map(l => l._id).every(id => selectedLinkIds.includes(id)) ? 'Deselect' : 'Select All'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.bulkText, { color: colors.text }]} numberOfLines={1}>{selectedLinkIds.length} selected</Text>
              <View style={styles.bulkActions}>
                <TouchableOpacity onPress={handleBulkDeleteLinks} style={styles.bulkIconBtn}>
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
                <TouchableOpacity onPress={clearSelection} style={styles.bulkIconBtn}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.bulkText, { color: colors.textSecondary }]}>Long press to select multiple bookmarks</Text>
              <TouchableOpacity onPress={() => setSelectionMode(true)}>
                <Text style={[styles.selectAction, { color: colors.primary }]}>Select</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Search bookmarks */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search bookmarks, domains, details..."
          onClear={() => setQuery('')}
        />

        {filteredLinks.length === 0 ? (
          <FlatList
            data={[]}
            onRefresh={refreshData}
            refreshing={loading}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <EmptyState
                icon={Link2}
                title={query ? "No bookmarks match" : "Bookmarks Empty"}
                description={query ? "Adjust search keywords." : "Keep important URLs, reference websites, or online documents saved."}
                actionLabel={query ? null : "Add Bookmark"}
                onAction={() => setModalVisible(true)}
              />
            }
            renderItem={null}
          />
        ) : (
          <FlatList
            data={filteredLinks}
            keyExtractor={(item) => item._id}
            onRefresh={refreshData}
            refreshing={loading}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <LinkCard
                bookmark={item}
                onEdit={() => {
                  setSelectedLinkToEdit(item);
                  setModalVisible(true);
                }}
                onDelete={() => handleDelete(item._id, item.title)}
                onLongPress={() => startSelection(item._id)}
                selectionMode={selectionMode}
                selected={selectedLinkIds.includes(item._id)}
                onToggleSelect={() => toggleLinkSelection(item._id)}
              />
            )}
          />
        )}
      </View>

      {/* Floating Add trigger */}
      {!selectionMode ? (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      {/* Save Modal */}
      <CreateLinkModal
        visible={modalVisible}
        linkToEdit={selectedLinkToEdit}
        onSave={handleSave}
        onCancel={() => {
          setModalVisible(false);
          setSelectedLinkToEdit(null);
        }}
      />
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
  list: {
    paddingBottom: 80,
  },
  bulkBar: {
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    paddingRight: 12,
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkIconBtn: {
    padding: 6,
    marginLeft: 8,
  },
  selectAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4.5,
    zIndex: 99,
  }
});
