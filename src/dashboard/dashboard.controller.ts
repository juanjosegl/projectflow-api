import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my personal dashboard stats' })
  getMyStats(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getMyStats(user.id);
  }

  @Get('teams/:teamId')
  @ApiOperation({ summary: 'Get team dashboard stats' })
  getTeamStats(@Param('teamId') teamId: string, @CurrentUser() user: AuthUser) {
    return this.dashboardService.getTeamStats(teamId, user.id);
  }
}
