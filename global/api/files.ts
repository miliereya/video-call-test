import type { AttachmentKind } from '@global/types'

export interface SignUploadRequest {
	kind: AttachmentKind
	mimeType: string
	sizeBytes: number
}

export interface SignUploadResponse {
	key: string
	uploadUrl: string
	uploadHeaders: Record<string, string>
	downloadUrl: string
}

export interface SignDownloadRequest {
	keys: string[]
}

export interface SignDownloadResponse {
	urls: Record<string, string>
}
