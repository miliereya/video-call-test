import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { API_PREFIX } from '@global/api/routes'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''))

	const corsOrigin = process.env.CORS_ORIGIN
	app.enableCors({
		origin: !corsOrigin || corsOrigin === '*'
			? true
			: corsOrigin.split(',').map((s) => s.trim()),
		credentials: true,
	})

	const port = Number(process.env.PORT) || 3000
	await app.listen(port, '0.0.0.0')
	console.log(`Backend listening on port ${port} (prefix ${API_PREFIX})`)
}

bootstrap()
