export type UserId = string;

export interface PublicUser {
  id: UserId;
  username: string;
  displayName: string;
  publicKey: string;
  createdAt: string;
}

export interface SelfUser extends PublicUser {
  email: string | null;
}
