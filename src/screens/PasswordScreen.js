import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Plus, Key, Search, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { passwordService } from '../services/passwordService';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import PasswordCard from '../components/PasswordCard';
import CreatePasswordModal from '../components/CreatePasswordModal';

export default function PasswordScreen({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { passwords, refreshData, loading, isConnected } = dbContext;

  // Search input query
  const [query, setQuery] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntryToEdit, setSelectedEntryToEdit] = useState(null);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const startSelection = (id) => {
    setSelectionMode(true);
    setSelectedIds([id]);
  };

  const toggleSelection = (id) => {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id]
    ));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const total = selectedIds.length;
    Alert.alert(
      'Delete Selected Credentials? ⚠️',
      `Are you sure you want to permanently move ${total} entries to the Recycle Bin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedIds.map(id => passwordService.deletePassword(id, dbContext)));
              clearSelection();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  // Load editing trigger from route redirects if present
  useEffect(() => {
    if (route.params?.passwordToEdit) {
      setSelectedEntryToEdit(route.params.passwordToEdit);
      setModalVisible(true);
      // Clean params
      navigation.setParams({ passwordToEdit: null });
    }
  }, [route.params?.passwordToEdit]);

  const handleSave = async (data) => {
    try {
      if (selectedEntryToEdit) {
        await passwordService.updatePassword(selectedEntryToEdit._id, data, dbContext);
        Alert.alert(
          'Updated',
          isConnected
            ? `Credentials for "${data.title}" were updated and synced to Firebase.`
            : `Credentials for "${data.title}" were updated offline and will auto-sync to Firebase when the connection returns.`
        );
      } else {
        await passwordService.createPassword(
          data.title,
          data.website,
          data.username,
          data.password,
          data.notes,
          null, // root by default
          dbContext
        );
        Alert.alert(
          'Saved',
          isConnected
            ? `Credentials for "${data.title}" were saved to the vault and synced to Firebase.`
            : `Credentials for "${data.title}" were saved offline and will auto-sync to Firebase when the connection returns.`
        );
      }
      setModalVisible(false);
      setSelectedEntryToEdit(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (id, title) => {
    Alert.alert(
      'Delete Credentials? ⚠️',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await passwordService.deletePassword(id, dbContext);
          }
        }
      ]
    );
  };

  // Filtered credentials list based on query
  const getFiltered = () => {
    const active = passwords.filter(p => !p.deleted);
    if (!query.trim()) return active;
    
    const cleanQ = query.toLowerCase().trim();
    return active.filter(p => 
      p.title.toLowerCase().includes(cleanQ) || 
      p.username.toLowerCase().includes(cleanQ) || 
      p.website.toLowerCase().includes(cleanQ)
    );
  };

  const filteredPasswords = getFiltered();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Credentials Vault" />

      <View style={styles.content}>
        {/* Search inside Vault */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search accounts, titles, URLs..."
          onClear={() => setQuery('')}
        />

        {/* Vault security banner banner */}
        {/* Bulk selection bar */}
        {selectionMode || selectedIds.length > 0 ? (
          <View style={[styles.bulkBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => {
                const allIds = filteredPasswords.map(p => p._id);
                const isAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
                if (isAllSelected) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(allIds);
                }
              }}
              style={{ marginRight: 10 }}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                {filteredPasswords.length > 0 && filteredPasswords.map(p => p._id).every(id => selectedIds.includes(id)) ? 'Deselect' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.bulkText, { color: colors.text }]} numberOfLines={1}>{selectedIds.length} selected</Text>
            <View style={styles.bulkActions}>
              <TouchableOpacity onPress={handleBulkDelete} style={styles.bulkIconBtn}>
                <Trash2 size={18} color={colors.danger} />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSelection} style={styles.bulkIconBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
            <ShieldCheck size={18} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={[styles.bannerText, { color: colors.text }]}>
              Credentials are encrypted in the vault and auto-sync to Firebase when cloud sync is available.
            </Text>
          </View>
        )}

        {filteredPasswords.length === 0 ? (
          <FlatList
            data={[]}
            onRefresh={refreshData}
            refreshing={loading}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <EmptyState
                icon={Key}
                title={query ? "No credentials match" : "Vault Empty"}
                description={query ? "Try adjusting search spelling or filters." : "Store secure passwords, usernames, and codes."}
                actionLabel={query ? null : "Add Credentials"}
                onAction={() => setModalVisible(true)}
              />
            }
            renderItem={null}
          />
        ) : (
          <FlatList
            data={filteredPasswords}
            keyExtractor={(item) => item._id}
            onRefresh={refreshData}
            refreshing={loading}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item._id);
              return (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onLongPress={() => startSelection(item._id)}
                  onPress={() => {
                    if (selectionMode) {
                      toggleSelection(item._id);
                    }
                  }}
                  style={isSelected ? { borderWidth: 2, borderColor: colors.primary, borderRadius: 14, marginVertical: 2 } : null}
                >
                  <PasswordCard
                    entry={item}
                    onEdit={() => {
                      setSelectedEntryToEdit(item);
                      setModalVisible(true);
                    }}
                    onDelete={() => handleDelete(item._id, item.title)}
                  />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Floating Plus button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <CreatePasswordModal
        visible={modalVisible}
        passwordToEdit={selectedEntryToEdit}
        onSave={handleSave}
        onCancel={() => {
          setModalVisible(false);
          setSelectedEntryToEdit(null);
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  list: {
    paddingBottom: 80,
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
});
