import {
  Controller,
  Get,
  Post,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
} from '@nestjs/common';
import { CsbRequestsService } from './csb-requests.service';
import { CsbSyncService } from '../csb-api/csb-sync.service';
import type { CsbRequestSearchParams } from '@org/types';

@Controller('csb-requests')
export class CsbRequestsController {
  constructor(
    private readonly csbRequestsService: CsbRequestsService,
    private readonly syncService: CsbSyncService,
  ) {}

  /**
   * GET /api/csb-requests
   * Search and filter CSB requests with optional pagination.
   */
  @Get()
  search(
    @Query('keyword') keyword?: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('ward') ward?: string,
    @Query('status') status?: string,
    @Query('group') group?: string,
    @Query('problemCode') problemCode?: string,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) yearRaw = 0,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) monthRaw = 0,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize = 25,
  ) {
    const params: CsbRequestSearchParams = {
      keyword,
      neighborhood,
      ward,
      status,
      group,
      problemCode,
      year: yearRaw || undefined,
      month: monthRaw || undefined,
      dateFrom,
      dateTo,
      page,
      pageSize: Math.min(pageSize, 100),
    };
    return this.csbRequestsService.search(params);
  }

  /**
   * GET /api/csb-requests/stats/monthly
   * Returns request counts grouped by year and month.
   */
  @Get('stats/monthly')
  getMonthlyStats() {
    return this.csbRequestsService.getMonthlyStats();
  }

  /**
   * GET /api/csb-requests/filters
   * Returns unique values for each filterable field.
   */
  @Get('filters')
  getFilterOptions() {
    return this.csbRequestsService.getFilterOptions();
  }

  /**
   * POST /api/csb-requests/sync
   * Triggers a manual sync from the St. Louis CSB API into SQLite.
   */
  @Post('sync')
  @HttpCode(200)
  async sync() {
    return this.syncService.sync();
  }
}
