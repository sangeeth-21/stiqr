import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across all entities' })
  search(@Query('q') q: string, @Query('type') type?: string) {
    return this.searchService.globalSearch(q, type);
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Auto-suggest for products and customers' })
  suggest(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.searchService.suggest(q, limit ? parseInt(limit, 10) : 10);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Search statistics (counts per type)' })
  stats(@Query('q') q: string) {
    return this.searchService.getStats(q);
  }
}
