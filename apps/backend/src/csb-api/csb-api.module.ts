import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CsbApiService } from './csb-api.service';
import { CsbSyncService } from './csb-sync.service';

@Module({
  imports: [HttpModule],
  providers: [CsbApiService, CsbSyncService],
  exports: [CsbSyncService],
})
export class CsbApiModule {}
