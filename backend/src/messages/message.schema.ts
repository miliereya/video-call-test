import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import type { MessageKind } from '@global/api/messages'

export type MessageDocument = HydratedDocument<Message>

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
	@Prop({ required: true, index: true })
	senderId!: string

	@Prop({
		type: String,
		required: true,
		enum: ['text', 'image', 'video', 'voice', 'call'],
	})
	kind!: MessageKind

	@Prop()
	text?: string

	@Prop()
	attachmentUrl?: string

	@Prop()
	attachmentIv?: string

	@Prop()
	mimeType?: string

	@Prop()
	sizeBytes?: number

	@Prop()
	durationSec?: number

	@Prop()
	missed?: boolean

	@Prop()
	blurred?: boolean

	@Prop()
	encrypted?: boolean

	@Prop({
		type: [{ userId: { type: String, required: true }, emoji: { type: String, required: true }, _id: false }],
		default: [],
	})
	reactions?: { userId: string; emoji: string }[]
}

export const MessageSchema = SchemaFactory.createForClass(Message)
