import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import type { MessageDto, SendMessagePayload } from '@global/api/messages'
import { Message, MessageDocument } from './message.schema'

@Injectable()
export class MessagesService {
	constructor(
		@InjectModel(Message.name)
		private readonly model: Model<MessageDocument>,
	) {}

	async list(
		limit = 100,
		before?: string,
	): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
		const safeLimit = Math.max(1, Math.min(limit, 500))
		const filter: Record<string, unknown> = {}
		if (before) {
			try {
				const beforeDoc = (await this.model
					.findById(before)
					.lean()) as { createdAt?: Date } | null
				if (beforeDoc?.createdAt) {
					filter.createdAt = { $lt: beforeDoc.createdAt }
				}
			} catch {
				// invalid id — ignore filter
			}
		}
		const docs = await this.model
			.find(filter)
			.sort({ createdAt: -1 })
			.limit(safeLimit + 1)
			.lean()
		const hasMore = docs.length > safeLimit
		const slice = hasMore ? docs.slice(0, safeLimit) : docs
		const messages = slice.reverse().map((d) => this.toDto(d))
		return { messages, hasMore }
	}

	async create(senderId: string, payload: SendMessagePayload): Promise<MessageDto> {
		const doc = await this.model.create({ senderId, ...payload })
		return this.toDto(doc.toObject())
	}

	async toggleReaction(
		messageId: string,
		userId: string,
		emoji: string,
	): Promise<MessageDto> {
		const doc = await this.model.findById(messageId)
		if (!doc) throw new NotFoundException('Message not found')
		const reactions = doc.reactions ?? []
		const existingIdx = reactions.findIndex((r) => r.userId === userId)
		if (existingIdx >= 0) {
			const existing = reactions[existingIdx]!
			if (existing.emoji === emoji) {
				reactions.splice(existingIdx, 1)
			} else {
				existing.emoji = emoji
			}
		} else {
			reactions.push({ userId, emoji })
		}
		doc.reactions = reactions
		doc.markModified('reactions')
		await doc.save()
		return this.toDto(doc.toObject())
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private toDto(doc: any): MessageDto {
		const created = doc.createdAt
		return {
			id: String(doc._id),
			senderId: String(doc.senderId),
			kind: doc.kind,
			text: doc.text,
			attachmentUrl: doc.attachmentUrl,
			attachmentIv: doc.attachmentIv,
			mimeType: doc.mimeType,
			sizeBytes: doc.sizeBytes,
			durationSec: doc.durationSec,
			missed: doc.missed,
			blurred: doc.blurred,
			encrypted: doc.encrypted,
			reactions: Array.isArray(doc.reactions)
				? doc.reactions.map((r: { userId: string; emoji: string }) => ({
						userId: r.userId,
						emoji: r.emoji,
					}))
				: [],
			createdAt:
				created instanceof Date ? created.toISOString() : String(created),
		}
	}
}
