import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import type { SelfUser } from '@global/types'
import type {
	ListMessagesResponse,
	SendMessagePayload,
	SendMessageResponse,
	ToggleReactionPayload,
	ToggleReactionResponse,
} from '@global/api/messages'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { MessagesService } from './messages.service'

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
	constructor(private readonly messages: MessagesService) {}

	@Get()
	async list(): Promise<ListMessagesResponse> {
		const messages = await this.messages.list()
		return { messages }
	}

	@Post()
	async send(
		@CurrentUser() user: SelfUser,
		@Body() body: SendMessagePayload,
	): Promise<SendMessageResponse> {
		const message = await this.messages.create(user.id, body)
		return { message }
	}

	@Post(':id/reactions')
	async react(
		@CurrentUser() user: SelfUser,
		@Param('id') id: string,
		@Body() body: ToggleReactionPayload,
	): Promise<ToggleReactionResponse> {
		const message = await this.messages.toggleReaction(id, user.id, body.emoji)
		return { message }
	}
}
