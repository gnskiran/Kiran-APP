import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Config } from '../constants/Config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  // Request notification permissions automatically on startup
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('task-reminders', {
          name: 'Task Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F77',
        });
      }
      return true;
    } catch (e) {
      console.warn('Failed to request notifications permission:', e);
      return false;
    }
  },

  // Helper to format Date/Time
  getTriggerDate(dateStr, timeStr) {
    try {
      // Input dateStr: YYYY-MM-DD, timeStr: HH:MM
      const combinedString = `${dateStr}T${timeStr}:00`;
      const date = new Date(combinedString);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch (e) {
      return null;
    }
  },

  // Schedule task reminder
  async scheduleTaskReminder(task) {
    try {
      await this.cancelTaskNotifications(task._id);

      if (task.status === 'Completed') {
        return;
      }

      // 1. Task Reminder Notification
      if (task.reminderEnabled) {
        // Fallback defaults
        let reminderDate = task.reminderDate || task.dueDate || Config.getLocalDateString();
        let reminderTime = task.reminderTime || '09:00';

        const triggerDate = this.getTriggerDate(reminderDate, reminderTime);
        if (triggerDate && triggerDate > new Date()) {
          const reminderId = `reminder_${task._id}`;
          await Notifications.scheduleNotificationAsync({
            identifier: reminderId,
            content: {
              title: 'Task Reminder',
              body: `Task: ${task.taskName}\nDescription: ${task.taskDescription || ''}\nDue Date: ${task.dueDate || ''}\nStatus: ${task.status}`,
              data: { taskId: task._id, type: 'reminder' },
              sound: true,
              channelId: 'task-reminders',
            },
            trigger: triggerDate,
          });
          console.log(`Scheduled reminder notification for task ${task.taskName} at ${reminderDate} ${reminderTime}`);
        }
      }

      // 2. Overdue Task Notification
      if (task.dueDate && task.status !== 'Completed' && task.status !== 'Overdue') {
        // Schedule overdue warning at 09:00 AM on the day after the due date
        const parts = task.dueDate.split('-');
        if (parts.length === 3) {
          const nextDay = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + 1);
          nextDay.setHours(9, 0, 0, 0); // 09:00 AM next day

          if (nextDay > new Date()) {
            const overdueId = `overdue_${task._id}`;
            await Notifications.scheduleNotificationAsync({
              identifier: overdueId,
              content: {
                title: 'Task Overdue',
                body: `Task "${task.taskName}" has passed its due date and is still not completed.`,
                data: { taskId: task._id, type: 'overdue' },
                sound: true,
                channelId: 'task-reminders',
              },
              trigger: nextDay,
            });
            console.log(`Scheduled overdue notification for task ${task.taskName} at ${nextDay.toISOString()}`);
          }
        }
      }
    } catch (e) {
      console.error('Failed to schedule task notifications:', e);
    }
  },

  // Cancel both reminder and overdue notifications for a task
  async cancelTaskNotifications(taskId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`reminder_${taskId}`);
      await Notifications.cancelScheduledNotificationAsync(`overdue_${taskId}`);
      console.log(`Cancelled all pending notifications for task: ${taskId}`);
    } catch (e) {
      console.warn('Failed to cancel notifications for task:', taskId, e.message);
    }
  },

  // Display immediate local alert for overdue task (called during batch checks)
  async showImmediateOverdueNotification(task) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Overdue',
          body: `Task "${task.taskName}" has passed its due date and is still not completed.`,
          data: { taskId: task._id, type: 'overdue' },
          sound: true,
          channelId: 'task-reminders',
        },
        trigger: null,
      });
    } catch (e) {
      console.error('Failed to display immediate overdue notification:', e);
    }
  }
};
