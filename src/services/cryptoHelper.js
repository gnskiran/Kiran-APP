const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function btoa(input) {
  let str = String(input);
  let block = 0, output = '', prx = 0;
  for (let idx = 0; idx < str.length; idx++) {
    const charCode = str.charCodeAt(idx);
    block = (block << 8) | charCode;
    prx += 8;
    while (prx >= 6) {
      prx -= 6;
      output += chars.charAt((block >> prx) & 63);
    }
  }
  if (prx > 0) {
    block = block << (6 - prx);
    output += chars.charAt(block & 63);
  }
  const padding = (4 - (output.length % 4)) % 4;
  for (let i = 0; i < padding; i++) {
    output += '=';
  }
  return output;
}

function atob(input) {
  let str = String(input).replace(/[=]+$/, '');
  let block = 0, output = '', prx = 0;
  for (let idx = 0; idx < str.length; idx++) {
    const charCode = chars.indexOf(str.charAt(idx));
    if (charCode === -1) continue;
    block = (block << 6) | charCode;
    prx += 6;
    while (prx >= 8) {
      prx -= 8;
      output += String.fromCharCode((block >> prx) & 255);
    }
  }
  return output;
}

export function encryptPassword(plainText) {
  if (!plainText) return plainText;
  if (plainText.startsWith('enc:')) return plainText; // already encrypted
  try {
    let cipherText = '';
    for (let i = 0; i < plainText.length; i++) {
      cipherText += String.fromCharCode(plainText.charCodeAt(i) ^ 42); // XOR key 42
    }
    return 'enc:' + btoa(cipherText);
  } catch (e) {
    console.warn('Encryption failed:', e.message);
    return plainText;
  }
}

export function decryptPassword(cipherText) {
  if (!cipherText) return cipherText;
  if (!cipherText.startsWith('enc:')) return cipherText; // not encrypted (legacy plain text)
  try {
    const raw = atob(cipherText.substring(4));
    let plainText = '';
    for (let i = 0; i < raw.length; i++) {
      plainText += String.fromCharCode(raw.charCodeAt(i) ^ 42);
    }
    return plainText;
  } catch (e) {
    console.warn('Decryption failed:', e.message);
    return cipherText;
  }
}
