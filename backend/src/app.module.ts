import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { CallsModule } from './calls/calls.module'
import { FilesModule } from './files/files.module'
import { MessagesModule } from './messages/messages.module'

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MongooseModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				const uri =
					config.get<string>('MONGO_URI') ?? 'mongodb://localhost:27017/'
				const isProd = config.get<string>('NODE_ENV') === 'production'
				return { uri, dbName: isProd ? 'prod' : 'dev' }
			},
		}),
		AuthModule,
		MessagesModule,
		FilesModule,
		CallsModule,
	],
	controllers: [AppController],
})
export class AppModule {}
