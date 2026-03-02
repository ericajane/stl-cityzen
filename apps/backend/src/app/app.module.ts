import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CsbRequestsModule } from '../csb-requests/csb-requests.module';

@Module({
  imports: [DatabaseModule, CsbRequestsModule],
})
export class AppModule {}
