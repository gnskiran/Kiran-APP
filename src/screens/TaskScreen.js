import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { Plus, Search, ClipboardList, AlertTriangle, Calendar, Award, Star, ListFilter, ArrowUpDown, Trash2, X } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DatabaseContext } from '../context/DatabaseContext';
import { taskService } from '../services/taskService';
import { Config } from '../constants/Config';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';

export default function TaskScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const dbContext = useContext(DatabaseContext);
  const { tasks, refreshData, loading } = dbContext;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'High Priority'
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate' | 'createdDate' | 'updatedAt' | 'priority' | 'status'
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

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
      'Delete Selected Tasks? ⚠️',
      `Are you sure you want to permanently move ${total} tasks to the Recycle Bin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedIds.map(id => taskService.deleteTask(id, dbContext, false)));
              clearSelection();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  // Active (non-deleted) tasks
  const activeTasks = tasks.filter(t => !t.deleted);
  const todayStr = Config.getLocalDateString();

  // Statistics calculation
  const totalCount = activeTasks.length;
  const pendingCount = activeTasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = activeTasks.filter(t => t.status === 'In Progress').length;
  const completedCount = activeTasks.filter(t => t.status === 'Completed').length;
  const overdueCount = activeTasks.filter(t => t.status === 'Overdue' || (t.status !== 'Completed' && t.dueDate && t.dueDate < todayStr)).length;
  const dueTodayCount = activeTasks.filter(t => t.dueDate === todayStr).length;

  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return Config.getLocalDateString(tomorrow);
  };
  const tomorrowStr = getTomorrowStr();
  const dueTomorrowCount = activeTasks.filter(t => t.dueDate === tomorrowStr).length;

  const getDueThisWeekCount = () => {
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      weekDates.push(Config.getLocalDateString(d));
    }
    return activeTasks.filter(t => t.dueDate && weekDates.includes(t.dueDate)).length;
  };
  const dueThisWeekCount = getDueThisWeekCount();

  // Save / Update Task Action
  const handleSaveTask = async (taskData) => {
    try {
      if (taskToEdit) {
        await taskService.updateTask(taskToEdit._id, taskData, dbContext);
        Alert.alert('Success 🎉', 'Task updated successfully.');
      } else {
        await taskService.createTask(taskData, dbContext);
        Alert.alert('Success 🎉', 'Task created successfully.');
      }
      setCreateModalVisible(false);
      setTaskToEdit(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setCreateModalVisible(true);
  };

  const handleDeleteTask = (task) => {
    Alert.alert(
      'Move to Recycle Bin?',
      `Are you sure you want to delete "${task.taskName}"? You can restore it later from the Recycle Bin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskService.deleteTask(task._id, dbContext, false);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  // Get filtered and sorted list
  const getFilteredAndSortedTasks = () => {
    let list = [...activeTasks];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        (t.taskName || '').toLowerCase().includes(q) ||
        (t.taskDescription || '').toLowerCase().includes(q) ||
        (t.status || '').toLowerCase().includes(q) ||
        (t.priority || '').toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (activeFilter === 'Pending') {
      list = list.filter(t => t.status === 'Pending');
    } else if (activeFilter === 'In Progress') {
      list = list.filter(t => t.status === 'In Progress');
    } else if (activeFilter === 'Completed') {
      list = list.filter(t => t.status === 'Completed');
    } else if (activeFilter === 'Overdue') {
      list = list.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < todayStr);
    } else if (activeFilter === 'High Priority') {
      list = list.filter(t => t.priority === 'High' || t.priority === 'Critical');
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'dueDate') {
        // Place empty due dates at the end
        const valA = a.dueDate || '9999-99-99';
        const valB = b.dueDate || '9999-99-99';
        return valA.localeCompare(valB);
      }
      if (sortBy === 'createdDate') {
        const valA = a.createdAt || a.createdDate || '';
        const valB = b.createdAt || b.createdDate || '';
        return valB.localeCompare(valA); // Newest first
      }
      if (sortBy === 'updatedAt') {
        const valA = a.updatedAt || '';
        const valB = b.updatedAt || '';
        return valB.localeCompare(valA); // Newest first
      }
      if (sortBy === 'priority') {
        const weights = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        const wA = weights[a.priority] || 0;
        const wB = weights[b.priority] || 0;
        return wB - wA; // Highest priority first
      }
      if (sortBy === 'status') {
        const weights = { 'Pending': 1, 'In Progress': 2, 'Completed': 3 };
        const wA = weights[a.status] || 0;
        const wB = weights[b.status] || 0;
        return wA - wB; // Pending first
      }
      return 0;
    });

    return list;
  };

  const processedTasks = getFilteredAndSortedTasks();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Task Manager" />

      {selectionMode || selectedIds.length > 0 ? (
        <View style={[styles.bulkBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => {
              const allIds = processedTasks.map(t => t._id);
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
              {processedTasks.length > 0 && processedTasks.map(t => t._id).every(id => selectedIds.includes(id)) ? 'Deselect All' : 'Select All'}
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
        <View style={styles.headerActionRow}>
          <Text style={[styles.dashboardHeader, { color: colors.text }]}>Dashboard</Text>
          <TouchableOpacity
            style={[styles.addNewButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setTaskToEdit(null);
              setCreateModalVisible(true);
            }}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addNewButtonText}>New Task</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} colors={[colors.primary]} />
        }
      >
        {/* ==========================================
            TASK MANAGER STATISTICS DASHBOARD
           ========================================== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
        >
          {/* Card: Total */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight }]}>
              <ClipboardList size={18} color={colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: colors.text }]}>{totalCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Tasks</Text>
            </View>
          </View>

          {/* Card: Pending */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <ClipboardList size={18} color={colors.warning} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: colors.warning }]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Tasks</Text>
            </View>
          </View>

          {/* Card: In Progress */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight }]}>
              <ClipboardList size={18} color={colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: colors.primary }]}>{inProgressCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
            </View>
          </View>

          {/* Card: Completed */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.accentLight }]}>
              <Award size={18} color={colors.accent} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: colors.accent }]}>{completedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed Tasks</Text>
            </View>
          </View>

          {/* Card: Overdue */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: overdueCount > 0 ? colors.danger : colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: overdueCount > 0 ? '#FEE2E2' : colors.border }]}>
              <AlertTriangle size={18} color={overdueCount > 0 ? colors.danger : colors.textSecondary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: overdueCount > 0 ? colors.danger : colors.text }]}>{overdueCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue Tasks</Text>
            </View>
          </View>

          {/* Card: Due Today */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.accentLight }]}>
              <Calendar size={18} color={colors.accent} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: colors.text }]}>{dueTodayCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Due Today</Text>
            </View>
          </View>

          {/* Card: Due Tomorrow */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Calendar size={18} color="#8B5CF6" />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: colors.text }]}>{dueTomorrowCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Due Tomorrow</Text>
            </View>
          </View>

          {/* Card: Due This Week */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Star size={18} color="#8B5CF6" />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statCount, { color: colors.text }]}>{dueThisWeekCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Due This Week</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.searchSection}>
          {/* Rounded Input */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks, descriptions, priorities..."
            onClear={() => setSearchQuery('')}
          />
        </View>

        {/* Filter Pills Selector */}
        <View style={styles.filterSection}>
          <View style={styles.sectionHeaderRow}>
            <ListFilter size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.filterTitle, { color: colors.textSecondary }]}>Filter Tasks</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
            {['All', 'Pending', 'In Progress', 'Completed', 'Overdue', 'High Priority'].map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: isActive ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isActive ? '700' : '500'
                      }
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sorting Section */}
        <View style={[styles.sortingRow, { borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ArrowUpDown size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.sortingLabel, { color: colors.textSecondary }]}>Sort By:</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            {[
              { id: 'dueDate', label: 'Due Date' },
              { id: 'createdDate', label: 'Date Created' },
              { id: 'updatedAt', label: 'Date Updated' },
              { id: 'priority', label: 'Priority' },
              { id: 'status', label: 'Status' }
            ].map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortBtn,
                  {
                    backgroundColor: sortBy === option.id ? colors.primaryLight : 'transparent',
                  }
                ]}
                onPress={() => setSortBy(option.id)}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    {
                      color: sortBy === option.id ? colors.primary : colors.textSecondary,
                      fontWeight: sortBy === option.id ? '700' : '500'
                    }
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tasks List */}
        <View style={styles.listContainer}>
          {processedTasks.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <EmptyState
                icon={ClipboardList}
                title="No tasks match your selection"
                description={
                  searchQuery.trim()
                    ? "Try checking your spelling or broadening search queries."
                    : "Create tasks to coordinate, structure, and check off items."
                }
              />
            </View>
          ) : (
            processedTasks.map((item) => (
              <TaskCard
                key={item._id}
                task={item}
                onEdit={() => handleEditTask(item)}
                onDelete={() => handleDeleteTask(item)}
                navigation={navigation}
                onLongPress={() => startSelection(item._id)}
                selectionMode={selectionMode}
                selected={selectedIds.includes(item._id)}
                onToggleSelect={() => toggleSelection(item._id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) for quick add */}
      {!selectionMode && (
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setTaskToEdit(null);
            setCreateModalVisible(true);
          }}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Create/Edit Modal */}
      <CreateTaskModal
        visible={createModalVisible}
        taskToEdit={taskToEdit}
        onSave={handleSaveTask}
        onCancel={() => {
          setCreateModalVisible(false);
          setTaskToEdit(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  dashboardHeader: {
    fontSize: 16,
    fontWeight: '800',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 1,
  },
  addNewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mainScroll: {
    flex: 1,
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginRight: 10,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statInfo: {
    justifyContent: 'center',
  },
  statCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  statusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  breakdownText: {
    fontSize: 10,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillsScroll: {
    paddingVertical: 2,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  pillText: {
    fontSize: 11,
  },
  sortingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    marginBottom: 8,
  },
  sortingLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortScroll: {
    alignItems: 'center',
    paddingLeft: 4,
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 4,
  },
  sortBtnText: {
    fontSize: 11,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  emptyWrapper: {
    marginTop: 20,
    alignItems: 'center',
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bulkBar: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
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
