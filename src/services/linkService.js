import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { storageService } from './storageService';

export const linkService = {
  // Fetch links
  async getLinks(dbContext) {
    return await storageService.getCollection('links', dbContext);
  },

  // Create new bookmark link
  async createLink(title, url, notes, folderId, dbContext) {
    let sanitizedUrl = url.trim();
    if (!/^https?:\/\//i.test(sanitizedUrl)) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    const body = {
      folderId: folderId || null,
      title,
      url: sanitizedUrl,
      notes: notes || ''
    };

    return await storageService.insertItem('links', body, dbContext);
  },

  // Update existing bookmark
  async updateLink(linkId, updatedFields, dbContext) {
    if (updatedFields.url) {
      let sanitizedUrl = updatedFields.url.trim();
      if (!/^https?:\/\//i.test(sanitizedUrl)) {
        sanitizedUrl = 'https://' + sanitizedUrl;
      }
      updatedFields.url = sanitizedUrl;
    }
    return await storageService.updateItem('links', linkId, updatedFields, dbContext);
  },

  // Delete bookmark
  async deleteLink(linkId, dbContext) {
    return await storageService.deleteItem('links', linkId, dbContext);
  },

  // Open web bookmark in-app beautifully using WebBrowser
  async openUrl(url) {
    try {
      console.log("Launching in-app browser for URL:", url);
      await WebBrowser.openBrowserAsync(url, {
        readerMode: false,
        enableBarCollapsing: true,
        dismissButtonStyle: 'close',
        toolbarColor: '#0F172A', // Slate-900 toolbar matching Kiran Drive
        secondaryToolbarColor: '#1E293B',
      });
    } catch (error) {
      console.log("In-app browser blocked/failed. Redirecting to native OS browser...", error.message);
      try {
        await Linking.openURL(url);
      } catch (nativeErr) {
        console.error("Could not load URL:", nativeErr);
      }
    }
  }
};
