import { Module } from '@nestjs/common';
import { CsbRequestsController } from './csb-requests.controller';
import { CsbRequestsService } from './csb-requests.service';

@Module({
  controllers: [CsbRequestsController],
  providers: [CsbRequestsService],
})
export class CsbRequestsModule {}
