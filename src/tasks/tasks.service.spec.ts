import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';

const members = [
  { userId: 'admin', role: 'ADMIN' },
  { userId: 'mgr', role: 'MANAGER' },
  { userId: 'dev', role: 'DEVELOPER' },
  { userId: 'dev2', role: 'DEVELOPER' },
];
const project = { id: 'p1', name: 'Website', team: { members } };

function setup(task: Record<string, unknown> = {}) {
  const stored = { id: 't1', title: 'Fix bug', status: 'TODO', assigneeId: null, creatorId: 'dev', project, ...task };
  const prisma = {
    project: { findUnique: jest.fn().mockResolvedValue(project) },
    task: {
      findFirst: jest.fn().mockResolvedValue({ position: 4 }),
      findUnique: jest.fn().mockResolvedValue(stored),
      create: jest.fn(({ data }) => ({ id: 't2', ...data })),
      update: jest.fn(({ data }) => ({ ...stored, ...data })),
      delete: jest.fn(),
    },
    notification: { create: jest.fn() },
  };
  return { service: new TasksService(prisma as any), prisma };
}

describe('TasksService', () => {
  describe('create', () => {
    it('blocks users outside the project team', async () => {
      const { service, prisma } = setup();
      await expect(service.create('p1', 'stranger', { title: 'x' } as any)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it('rejects assignees who are not in the team', async () => {
      const { service } = setup();
      await expect(service.create('p1', 'dev', { title: 'x', assigneeId: 'stranger' } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('appends to the end of the board and notifies the assignee', async () => {
      const { service, prisma } = setup();
      const task = await service.create('p1', 'mgr', { title: 'x', assigneeId: 'dev' } as any);
      expect(task.position).toBe(5);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'dev', type: 'TASK_ASSIGNED' }),
      });
    });

    it('does not notify you about a task you assign to yourself', async () => {
      const { service, prisma } = setup();
      await service.create('p1', 'dev', { title: 'x', assigneeId: 'dev' } as any);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('notifies the assignee when someone else moves their task', async () => {
      const { service, prisma } = setup({ assigneeId: 'dev' });
      await service.update('t1', 'mgr', { status: 'DONE' } as any);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'dev', type: 'TASK_STATUS_CHANGED' }),
      });
    });

    it('stays quiet when the assignee moves their own task', async () => {
      const { service, prisma } = setup({ assigneeId: 'dev' });
      await service.update('t1', 'dev', { status: 'DONE' } as any);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('clears the due date when it is set to null', async () => {
      const { service, prisma } = setup();
      await service.update('t1', 'dev', { dueDate: null } as any);
      expect(prisma.task.update.mock.calls[0][0].data.dueDate).toBeNull();
    });
  });

  describe('remove', () => {
    it("forbids a developer from deleting someone else's task", async () => {
      const { service, prisma } = setup({ creatorId: 'dev' });
      await expect(service.remove('t1', 'dev2')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.task.delete).not.toHaveBeenCalled();
    });

    it.each(['dev', 'mgr', 'admin'])('lets %s delete a task created by dev', async (userId) => {
      const { service, prisma } = setup({ creatorId: 'dev' });
      await service.remove('t1', userId);
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });
  });
});
