import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CallsGateway } from './calls.gateway'

@Module({
	imports: [AuthModule],
	providers: [CallsGateway],
})
export class CallsModule {}
