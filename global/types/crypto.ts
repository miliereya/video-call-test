export type Base64 = string;

export interface EncryptedPayload {
  ciphertext: Base64;
  iv: Base64;
  algorithm: 'AES-GCM-256';
}

export interface KeyBundle {
  publicKey: Base64;
  wrappedPrivateKey: EncryptedPayload;
  salt: Base64;
}
