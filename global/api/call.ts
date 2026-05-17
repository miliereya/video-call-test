import type { UserId } from '@global/types';

export type CallId = string;

export interface IceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

export type CallSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: IceCandidateInit }
  | { type: 'hangup' };

export interface CallInvite {
  callId: CallId;
  from: UserId;
  to: UserId;
  kind: 'audio' | 'video';
  startedAt: string;
}
