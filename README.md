# Kiran Drive

A premium offline-first personal cloud storage, password vault, document manager, task manager, and link organizer built with React Native and Firebase.

---

# Overview

Kiran Drive is a secure personal productivity application that allows users to organize files, folders, passwords, links, and tasks from a single mobile application.

The application is designed for personal use with Firebase Anonymous Authentication, Firestore cloud synchronization, local offline storage, and modern Material Design 3 UI.

---

# Features

## Folder Management

* Create folders
* Edit folders
* Delete folders
* Restore deleted folders
* Nested folder hierarchy
* Breadcrumb navigation
* Grid view
* List view
* Folder statistics
* Folder search

---

## File Management

* Upload files
* Store file metadata
* Organize files by folders
* File previews
* Recent files
* Favorite files
* Search files
* Delete files
* Restore files from recycle bin

---

## Password Vault

Securely store:

* Website credentials
* Usernames
* Passwords
* Notes

Features:

* Password categories
* Password generator
* Password strength indicator
* Copy username/password
* Search passwords
* Edit credentials
* Delete credentials
* Restore credentials

---

## Link Manager

Store and organize:

* Website links
* Reference URLs
* Learning resources
* Documentation links

Features:

* Search links
* Edit links
* Delete links
* Restore links

---

## Task Manager

Manage daily tasks efficiently.

Features:

* Create tasks
* Edit tasks
* Delete tasks
* Restore tasks
* Task status tracking
* Pending status
* In Progress status
* Completed status
* Due dates
* Completion dates
* Reminder notifications
* Dashboard statistics

---

## Dashboard

Comprehensive dashboard displaying:

* Total folders
* Total files
* Total passwords
* Total links
* Total tasks
* Storage statistics
* Recent activity
* Quick access

---

## Search

Global search across:

* Folders
* Files
* Passwords
* Links
* Tasks

---

## Recycle Bin

Soft-delete support for:

* Folders
* Files
* Passwords
* Links
* Tasks

Features:

* Restore deleted items
* Permanently delete items

---

## Offline Support

* Works without internet
* Local cache storage
* Offline CRUD operations
* Automatic synchronization when online
* No data loss during network interruptions

---

## Cloud Synchronization

Powered by:

* Firebase Authentication
* Firebase Firestore

Features:

* Anonymous Authentication
* Automatic cloud synchronization
* Cross-device database support
* Real-time cloud persistence

---

## Security

* Firebase Authentication
* Firestore Security Rules
* Local data protection
* Personal-use architecture
* Secure cloud synchronization

---

# Technology Stack

## Frontend

* React Native
* React Navigation
* React Native Paper
* React Native Reanimated
* React Native Vector Icons

## Backend Services

* Firebase Authentication
* Firebase Firestore

## Local Storage

* AsyncStorage
* MMKV Storage

## Notifications

* Expo Notifications

```bash
git clone https://github.com/gnskiran/Kiran-APP.git

cd Kiran-APP

npm install
```

---

# Android Build

```bash
cd android

gradlew assembleRelease
```

Generated APK:

```text
android/app/build/outputs/apk/release/app-release.apk
```

---

# Project Structure

```text
Root
├── Documents
├── Images
├── Password Vault
├── Links
├── Tasks
├── Archive
├── Firebase
├── Offline Cache
└── Recycle Bin
```

---

# Future Enhancements

* PDF Viewer
* Image Gallery
* File Compression
* Fingerprint Authentication
* Face Authentication
* Cloud Backup
* Export & Import
* Multi-device Sync
* Firebase Storage Integration
* Advanced Analytics

---

# Author

Naga Siva Kiran

GitHub:
https://github.com/gnskiran

---

# License

This project is intended for personal and educational use.
