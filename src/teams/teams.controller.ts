import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a team (you become its admin)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Teams I belong to' })
  findMyTeams(@CurrentUser() user: AuthUser) {
    return this.teamsService.findMyTeams(user.id);
  }

  @Get('my-invitations')
  @ApiOperation({ summary: 'Pending invitations sent to my email' })
  getMyInvitations(@CurrentUser() user: AuthUser) {
    return this.teamsService.getMyInvitations(user.id);
  }

  @Get(':teamId')
  @ApiOperation({ summary: 'Team details, members and projects' })
  findOne(@Param('teamId') teamId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.findOne(teamId, user.id);
  }

  @Post(':teamId/invite')
  @ApiOperation({ summary: 'Invite someone by email (admin or manager)' })
  invite(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamsService.inviteMember(teamId, user.id, dto);
  }

  @Public()
  @Get('invitations/:token')
  @ApiOperation({ summary: 'Public preview of an invitation' })
  getInvitation(@Param('token') token: string) {
    return this.teamsService.getInvitationByToken(token);
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Accept an invitation' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.acceptInvitation(token, user.id);
  }

  @Post('invitations/:token/decline')
  @ApiOperation({ summary: 'Decline an invitation' })
  declineInvitation(
    @Param('token') token: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.declineInvitation(token, user.id);
  }

  @Delete(':teamId/leave')
  @ApiOperation({ summary: 'Leave a team (the last admin cannot)' })
  leave(@Param('teamId') teamId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.leaveTeam(teamId, user.id);
  }

  @Patch(':teamId/members/:memberId/role')
  @ApiOperation({ summary: "Change a member's role (admin)" })
  updateRole(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(teamId, user.id, memberId, dto);
  }

  @Delete(':teamId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member (admin)' })
  removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.removeMember(teamId, user.id, memberId);
  }
}
