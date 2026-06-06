import { storageService } from './storageService';

export const passwordService = {
  // Fetch active passwords
  async getPasswords(dbContext) {
    return await storageService.getCollection('passwords', dbContext);
  },

  // Create password entry
  async createPassword(title, website, username, password, notes, folderId, dbContext) {
    const body = {
      folderId: folderId || null,
      title,
      website: website || '',
      username,
      password,
      notes: notes || ''
    };
    return await storageService.insertItem('passwords', body, dbContext);
  },

  // Update password entry
  async updatePassword(passwordId, updatedFields, dbContext) {
    return await storageService.updateItem('passwords', passwordId, updatedFields, dbContext);
  },

  // Delete password entry
  async deletePassword(passwordId, dbContext) {
    return await storageService.deleteItem('passwords', passwordId, dbContext);
  },

  // Premium secure password generator utility
  generateSecurePassword(options = {}) {
    const {
      length = 16,
      includeUpper = true,
      includeLower = true,
      includeNumbers = true,
      includeSymbols = true
    } = options;

    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numChars = '0123456789';
    const symChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let allowedPool = '';
    let generatedPassword = '';

    if (includeUpper) allowedPool += upperChars;
    if (includeLower) allowedPool += lowerChars;
    if (includeNumbers) allowedPool += numChars;
    if (includeSymbols) allowedPool += symChars;

    // Fallback if nothing was selected
    if (allowedPool === '') {
      allowedPool = lowerChars + numChars;
    }

    // Ensure we select at least one character from each active category
    if (includeUpper) generatedPassword += upperChars[Math.floor(Math.random() * upperChars.length)];
    if (includeLower) generatedPassword += lowerChars[Math.floor(Math.random() * lowerChars.length)];
    if (includeNumbers) generatedPassword += numChars[Math.floor(Math.random() * numChars.length)];
    if (includeSymbols) generatedPassword += symChars[Math.floor(Math.random() * symChars.length)];

    const currentLen = generatedPassword.length;
    for (let i = currentLen; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * allowedPool.length);
      generatedPassword += allowedPool[randomIndex];
    }

    // Shuffle characters to guarantee randomness
    return generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');
  },

  // Evaluate password complexity / strength
  evaluatePasswordStrength(password) {
    if (!password) return { label: 'Empty', score: 0, color: '#94A3B8' };
    
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 14) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 0:
      case 1:
        return { label: 'Weak 😟', score, color: '#EF4444' }; // Red
      case 2:
      case 3:
        return { label: 'Moderate 😐', score, color: '#F59E0B' }; // Amber
      case 4:
        return { label: 'Strong 💪', score, color: '#10B981' }; // Emerald
      case 5:
      default:
        return { label: 'Very Strong 🔒', score, color: '#3B82F6' }; // Sapphire Blue
    }
  }
};
