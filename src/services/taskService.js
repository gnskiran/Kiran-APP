import { storageService } from './storageService';
import { Config } from '../constants/Config';
import { notificationService } from './notificationService';

export const taskService = {
  // Fetch tasks
  async getTasks(dbContext) {
    return await storageService.getCollection(Config.COLLECTIONS.TASKS, dbContext);
  },

  // Create new task
  async createTask(taskData, dbContext) {
    let reminderDate = taskData.reminderDate || '';
    let reminderTime = taskData.reminderTime || '';

    if (taskData.reminderEnabled && (!reminderDate || !reminderTime)) {
      reminderDate = reminderDate || taskData.dueDate || Config.getLocalDateString();
      reminderTime = reminderTime || '09:00';
    }

    const body = {
      taskName: taskData.taskName,
      taskDescription: taskData.taskDescription || '',
      status: taskData.status || 'Pending',
      priority: taskData.priority || 'Medium',
      createdDate: taskData.createdDate || Config.getLocalDateString(),
      dueDate: taskData.dueDate || '',
      reminderEnabled: taskData.reminderEnabled ?? false,
      reminderDateTime: taskData.reminderDateTime || `${reminderDate} ${reminderTime}`,
      reminderDate: reminderDate,
      reminderTime: reminderTime,
      relatedFolderId: taskData.relatedFolderId || '',
    };

    const result = await storageService.insertItem(Config.COLLECTIONS.TASKS, body, dbContext);
    if (result && result._id) {
      await notificationService.scheduleTaskReminder(result);
    }
    return result;
  },

  // Update existing task
  async updateTask(taskId, updatedFields, dbContext) {
    const result = await storageService.updateItem(Config.COLLECTIONS.TASKS, taskId, updatedFields, dbContext);
    
    // Fetch updated task and schedule/cancel
    const allTasks = dbContext.tasks;
    const task = allTasks.find(t => t._id === taskId);
    if (task) {
      const mergedTask = { ...task, ...updatedFields };
      if (mergedTask.status === 'Completed' || mergedTask.deleted) {
        await notificationService.cancelTaskNotifications(taskId);
      } else {
        await notificationService.scheduleTaskReminder(mergedTask);
      }
    }
    return result;
  },

  // Delete task (soft delete by default)
  async deleteTask(taskId, dbContext, permanent = false) {
    const result = await storageService.deleteItem(Config.COLLECTIONS.TASKS, taskId, dbContext, permanent);
    await notificationService.cancelTaskNotifications(taskId);
    return result;
  },

  // Cycle task status: Pending -> In Progress -> Completed -> Pending
  async cycleStatus(task, dbContext) {
    const statusFlow = {
      'Pending': 'In Progress',
      'In Progress': 'Completed',
      'Completed': 'Pending',
      'Overdue': 'Completed'
    };
    const nextStatus = statusFlow[task.status] || 'Pending';
    return await this.updateTask(task._id, { status: nextStatus }, dbContext);
  },

  // Duplicate task
  async duplicateTask(task, dbContext) {
    const body = {
      taskName: `${task.taskName} (Copy)`,
      taskDescription: task.taskDescription || '',
      status: task.status || 'Pending',
      priority: task.priority || 'Medium',
      createdDate: Config.getLocalDateString(),
      dueDate: task.dueDate || '',
      reminderEnabled: task.reminderEnabled ?? false,
      reminderDateTime: task.reminderDateTime || '',
      reminderDate: task.reminderDate || '',
      reminderTime: task.reminderTime || '',
      relatedFolderId: task.relatedFolderId || '',
    };

    const result = await storageService.insertItem(Config.COLLECTIONS.TASKS, body, dbContext);
    if (result && result._id) {
      await notificationService.scheduleTaskReminder(result);
    }
    return result;
  }
};
