import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { CsbRequestsModule } from '../csb-requests/csb-requests.module';
import { CsbApiModule } from '../csb-api/csb-api.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CsbRequestsModule,
    CsbApiModule,
  ],
})
export class AppModule {}
