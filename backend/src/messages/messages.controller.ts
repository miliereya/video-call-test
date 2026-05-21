import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common'
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
	async list(
		@Query('before') before?: string,
		@Query('limit') limit?: string,
	): Promise<ListMessagesResponse> {
		const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined
		const lim = Number.isFinite(parsedLimit) && (parsedLimit as number) > 0
			? (parsedLimit as number)
			: 100
		return this.messages.list(lim, before)
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
