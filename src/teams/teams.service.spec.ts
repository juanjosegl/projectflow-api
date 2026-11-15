import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TeamsService } from './teams.service';

const TEAM = 'team-1';

function setup(members: Record<string, Role>) {
  const prisma = {
    teamMember: {
      findUnique: jest.fn(({ where }) => {
        const { userId } = where.userId_teamId;
        return members[userId] ? { userId, teamId: TEAM, role: members[userId] } : null;
      }),
      count: jest.fn(({ where }) => Object.values(members).filter((r) => r === where.role).length),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn((args) => args.data),
      delete: jest.fn(),
      create: jest.fn(),
    },
    invitation: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ token: 'tok' }),
      update: jest.fn(),
    },
    team: { findUnique: jest.fn().mockResolvedValue({ id: TEAM, name: 'Team' }) },
    user: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };
  const email = { sendTeamInvitation: jest.fn() };
  return { service: new TeamsService(prisma as any, email as any), prisma, email };
}

describe('TeamsService permissions', () => {
  it('rejects invitations from developers and non-members', async () => {
    const { service } = setup({ dev: Role.DEVELOPER });
    const dto = { email: 'x@y.dev', role: Role.DEVELOPER };
    await expect(service.inviteMember(TEAM, 'dev', dto)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.inviteMember(TEAM, 'stranger', dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a manager invite and emails the invitee', async () => {
    const { service, prisma, email } = setup({ mgr: Role.MANAGER });
    prisma.user.findUnique.mockResolvedValue({ id: 'mgr', name: 'Bob' });
    await service.inviteMember(TEAM, 'mgr', { email: 'new@y.dev', role: Role.DEVELOPER });
    expect(prisma.invitation.create).toHaveBeenCalled();
    expect(email.sendTeamInvitation).toHaveBeenCalledWith(expect.objectContaining({ to: 'new@y.dev' }));
  });

  it('only admins change roles or remove members', async () => {
    const { service } = setup({ admin: Role.ADMIN, mgr: Role.MANAGER, dev: Role.DEVELOPER });
    await expect(service.updateMemberRole(TEAM, 'mgr', 'dev', { role: Role.MANAGER })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.removeMember(TEAM, 'mgr', 'dev')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('never leaves a team without an admin', async () => {
    const { service, prisma } = setup({ admin: Role.ADMIN, dev: Role.DEVELOPER });
    await expect(service.updateMemberRole(TEAM, 'admin', 'admin', { role: Role.DEVELOPER })).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.leaveTeam(TEAM, 'admin')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.removeMember(TEAM, 'admin', 'admin')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.teamMember.update).not.toHaveBeenCalled();
    expect(prisma.teamMember.delete).not.toHaveBeenCalled();
  });

  it('allows demoting an admin when another admin remains', async () => {
    const { service, prisma } = setup({ a1: Role.ADMIN, a2: Role.ADMIN });
    await service.updateMemberRole(TEAM, 'a1', 'a2', { role: Role.MANAGER });
    expect(prisma.teamMember.update).toHaveBeenCalled();
  });

  describe('acceptInvitation', () => {
    const invitation = (overrides = {}) => ({
      token: 'tok', teamId: TEAM, email: 'me@y.dev', role: Role.DEVELOPER, status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000), team: { name: 'Team' }, ...overrides,
    });

    it('rejects expired invitations', async () => {
      const { service, prisma } = setup({});
      prisma.invitation.findUnique.mockResolvedValue(invitation({ expiresAt: new Date(Date.now() - 1) }));
      await expect(service.acceptInvitation('tok', 'me')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects invitations addressed to someone else', async () => {
      const { service, prisma } = setup({});
      prisma.invitation.findUnique.mockResolvedValue(invitation());
      prisma.user.findUnique.mockResolvedValue({ id: 'other', email: 'other@y.dev' });
      await expect(service.acceptInvitation('tok', 'other')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('adds the member and marks the invitation accepted in one transaction', async () => {
      const { service, prisma } = setup({});
      prisma.invitation.findUnique.mockResolvedValue(invitation());
      prisma.user.findUnique.mockResolvedValue({ id: 'me', email: 'me@y.dev' });
      await service.acceptInvitation('tok', 'me');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.teamMember.create).toHaveBeenCalledWith({ data: { userId: 'me', teamId: TEAM, role: Role.DEVELOPER } });
      expect(prisma.invitation.update).toHaveBeenCalledWith({ where: { token: 'tok' }, data: { status: 'ACCEPTED' } });
    });
  });
});
