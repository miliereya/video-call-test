import type { UserId } from './user';
import type { EncryptedPayload } from './crypto';

export type MessageId = string;
export type ChatId = string;
export type AttachmentId = string;

export type AttachmentKind = 'image' | 'video' | 'voice' | 'file';

export interface EncryptedAttachmentRef {
  id: AttachmentId;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  encryptedKey: EncryptedPayload;
}

export interface ChatMessage {
  id: MessageId;
  chatId: ChatId;
  senderId: UserId;
  ciphertext: EncryptedPayload;
  attachments: EncryptedAttachmentRef[];
  createdAt: string;
  editedAt: string | null;
}
