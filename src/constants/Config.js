export const Config = {
  APP_NAME: 'Kiran',
  VERSION: '1.0.0',
  FIREBASE_ANDROID_PACKAGE: 'com.kiran.kirandrive',
  FIREBASE_STORAGE_ROOT: 'kiran-drive',
  FIREBASE_STORAGE_CAPACITY_BYTES: 5 * 1024 * 1024 * 1024,
  FIREBASE_ENV_KEYS: {
    PROJECT_NUMBER: 'FIREBASE_PROJECT_NUMBER',
    PROJECT_ID: 'FIREBASE_PROJECT_ID',
    STORAGE_BUCKET: 'FIREBASE_STORAGE_BUCKET',
    MOBILESDK_APP_ID: 'FIREBASE_MOBILESDK_APP_ID',
    API_KEY: 'FIREBASE_API_KEY',
    ANDROID_PACKAGE: 'FIREBASE_ANDROID_PACKAGE',
  },

  getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  COLLECTIONS: {
    FOLDERS: 'folders',
    FILES: 'files',
    IMAGES: 'images',
    PDFS: 'pdfs',
    LINKS: 'links',
    PASSWORDS: 'passwords',
    TASKS: 'tasks',
  },

  STORAGE_KEYS: {
    THEME: '@kiran_drive_theme',
    SYNC_QUEUE: '@kiran_drive_sync_queue',
    OFFLINE_FOLDERS: '@kiran_drive_folders_cache',
    OFFLINE_FILES: '@kiran_drive_files_cache',
    OFFLINE_LINKS: '@kiran_drive_links_cache',
    OFFLINE_PASSWORDS: '@kiran_drive_passwords_cache',
    OFFLINE_TASKS: '@kiran_drive_tasks_cache',
  },

  FILE_CATEGORIES: {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    PDF: ['pdf'],
    WORD: ['doc', 'docx', 'rtf'],
    EXCEL: ['xls', 'xlsx', 'csv'],
    TEXT: ['txt', 'md', 'html', 'json', 'xml'],
    ZIP: ['zip', 'rar', 'tar', 'gz', '7z'],
  },
};
