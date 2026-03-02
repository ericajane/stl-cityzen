import { Module } from '@nestjs/common';
import { CsbRequestsController } from './csb-requests.controller';
import { CsbRequestsService } from './csb-requests.service';
import { CsbApiModule } from '../csb-api/csb-api.module';

@Module({
  imports: [CsbApiModule],
  controllers: [CsbRequestsController],
  providers: [CsbRequestsService],
})
export class CsbRequestsModule {}
