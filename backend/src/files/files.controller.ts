import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import type {
	SignDownloadRequest,
	SignDownloadResponse,
	SignUploadRequest,
	SignUploadResponse,
} from '@global/api/files'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { FilesService } from './files.service'

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
	constructor(private readonly files: FilesService) {}

	@Post('sign-upload')
	signUpload(@Body() body: SignUploadRequest): Promise<SignUploadResponse> {
		return this.files.signUpload(body)
	}

	@Post('sign-download')
	signDownload(
		@Body() body: SignDownloadRequest,
	): Promise<SignDownloadResponse> {
		return this.files.signDownload(body)
	}
}
