export type MessageKind = 'text' | 'image' | 'video' | 'voice' | 'call'

export interface ReactionDto {
	userId: string
	emoji: string
}

export interface MessageDto {
	id: string
	senderId: string
	kind: MessageKind
	text?: string
	attachmentUrl?: string
	attachmentIv?: string
	mimeType?: string
	sizeBytes?: number
	durationSec?: number
	missed?: boolean
	blurred?: boolean
	encrypted?: boolean
	reactions?: ReactionDto[]
	createdAt: string
}

export interface SendMessagePayload {
	kind: MessageKind
	text?: string
	attachmentUrl?: string
	attachmentIv?: string
	mimeType?: string
	sizeBytes?: number
	durationSec?: number
	missed?: boolean
	blurred?: boolean
	encrypted?: boolean
}

export interface SendMessageResponse {
	message: MessageDto
}

export interface ListMessagesResponse {
	messages: MessageDto[]
}

export interface ToggleReactionPayload {
	emoji: string
}

export interface ToggleReactionResponse {
	message: MessageDto
}
