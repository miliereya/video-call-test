import { ApiRoutes } from '@global/api/routes'
import type {
	SignDownloadRequest,
	SignDownloadResponse,
	SignUploadRequest,
	SignUploadResponse,
} from '@global/api/files'
import { apiPost } from './client'

export function signUpload(
	req: SignUploadRequest,
): Promise<SignUploadResponse> {
	return apiPost<SignUploadRequest, SignUploadResponse>(
		ApiRoutes.files.signUpload,
		req,
	)
}

export function signDownload(keys: string[]): Promise<SignDownloadResponse> {
	return apiPost<SignDownloadRequest, SignDownloadResponse>(
		ApiRoutes.files.signDownload,
		{ keys },
	)
}

export function uploadToR2(
	url: string,
	headers: Record<string, string>,
	file: Blob,
	onProgress?: (ratio: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('PUT', url)
		for (const [k, v] of Object.entries(headers)) {
			xhr.setRequestHeader(k, v)
		}
		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable && onProgress) {
				onProgress(e.loaded / e.total)
			}
		})
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress?.(1)
				resolve()
			} else {
				reject(new Error(`R2 upload failed: ${xhr.status} ${xhr.statusText}`))
			}
		}
		xhr.onerror = () => reject(new Error('Network error during upload'))
		xhr.onabort = () => reject(new Error('Upload aborted'))
		xhr.send(file)
	})
}
