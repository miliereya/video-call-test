import { randomUUID } from 'crypto'
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
	SignDownloadRequest,
	SignDownloadResponse,
	SignUploadRequest,
	SignUploadResponse,
} from '@global/api/files'

const UPLOAD_TTL_SEC = 600
const DOWNLOAD_TTL_SEC = 3600

@Injectable()
export class FilesService implements OnModuleInit {
	private readonly logger = new Logger(FilesService.name)
	private client!: S3Client
	private bucket!: string

	constructor(private readonly config: ConfigService) {}

	onModuleInit(): void {
		const accountId = this.config.get<string>('R2_ACCOUNT_ID')
		const bucket = this.config.get<string>('R2_BUCKET')
		const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID')
		const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY')

		if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
			this.logger.warn(
				'R2 credentials are not fully configured — file upload will fail until env is set',
			)
			return
		}

		this.bucket = bucket
		this.client = new S3Client({
			region: 'auto',
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			credentials: { accessKeyId, secretAccessKey },
		})
	}

	async signUpload(req: SignUploadRequest): Promise<SignUploadResponse> {
		this.assertReady()
		const ext = this.extFor(req.mimeType, req.kind)
		const key = `messages/${randomUUID()}${ext}`
		const uploadUrl = await getSignedUrl(
			this.client,
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				ContentType: req.mimeType,
				ContentLength: req.sizeBytes,
			}),
			{ expiresIn: UPLOAD_TTL_SEC },
		)
		const downloadUrl = await this.signGet(key)
		return {
			key,
			uploadUrl,
			uploadHeaders: { 'Content-Type': req.mimeType },
			downloadUrl,
		}
	}

	async signDownload(req: SignDownloadRequest): Promise<SignDownloadResponse> {
		this.assertReady()
		const unique = Array.from(new Set(req.keys.filter(Boolean)))
		const entries = await Promise.all(
			unique.map(async (k) => [k, await this.signGet(k)] as const),
		)
		return { urls: Object.fromEntries(entries) }
	}

	private signGet(key: string): Promise<string> {
		return getSignedUrl(
			this.client,
			new GetObjectCommand({ Bucket: this.bucket, Key: key }),
			{ expiresIn: DOWNLOAD_TTL_SEC },
		)
	}

	private assertReady(): void {
		if (!this.client || !this.bucket) {
			throw new Error('R2 is not configured (check R2_* env vars)')
		}
	}

	private extFor(mimeType: string, kind: string): string {
		const sub = mimeType.split('/')[1]?.split(';')[0]
		if (sub) return `.${sub.toLowerCase()}`
		if (kind === 'image') return '.jpg'
		if (kind === 'video') return '.mp4'
		if (kind === 'voice') return '.webm'
		return ''
	}
}
