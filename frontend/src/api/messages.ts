import { ApiRoutes } from '@global/api/routes'
import type {
	ListMessagesResponse,
	SendMessagePayload,
	SendMessageResponse,
	ToggleReactionPayload,
	ToggleReactionResponse,
} from '@global/api/messages'
import { apiGet, apiPost } from './client'

export function listMessages(opts?: {
	before?: string
	limit?: number
}): Promise<ListMessagesResponse> {
	const params = new URLSearchParams()
	if (opts?.before) params.set('before', opts.before)
	if (opts?.limit) params.set('limit', String(opts.limit))
	const qs = params.toString()
	const url = qs ? `${ApiRoutes.messages.list}?${qs}` : ApiRoutes.messages.list
	return apiGet<ListMessagesResponse>(url)
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
