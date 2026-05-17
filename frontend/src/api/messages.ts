import { ApiRoutes } from '@global/api/routes'
import type {
	ListMessagesResponse,
	SendMessagePayload,
	SendMessageResponse,
	ToggleReactionPayload,
	ToggleReactionResponse,
} from '@global/api/messages'
import { apiGet, apiPost } from './client'

export function listMessages(): Promise<ListMessagesResponse> {
	return apiGet<ListMessagesResponse>(ApiRoutes.messages.list)
}

export function sendMessage(
	payload: SendMessagePayload,
): Promise<SendMessageResponse> {
	return apiPost<SendMessagePayload, SendMessageResponse>(
		ApiRoutes.messages.send,
		payload,
	)
}

export function toggleReaction(
	messageId: string,
	emoji: string,
): Promise<ToggleReactionResponse> {
	return apiPost<ToggleReactionPayload, ToggleReactionResponse>(
		ApiRoutes.messages.reactions(messageId),
		{ emoji },
	)
}
