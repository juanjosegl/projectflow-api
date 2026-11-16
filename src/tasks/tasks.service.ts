import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async assertProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isMember = project.team.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Access denied');
    return project;
  }

  private assertAssigneeInTeam(
    assigneeId: string | null | undefined,
    members: { userId: string }[],
  ) {
    if (assigneeId && !members.some((m) => m.userId === assigneeId)) {
      throw new BadRequestException(
        'Assignee must be a member of the project team',
      );
    }
  }

  // Prisma rejects date-only strings ("2024-03-01"); null clears the date.
  private toDate(value: string | null | undefined) {
    if (value === undefined) return undefined;
    return value === null ? null : new Date(value);
  }

  private async notify(data: Prisma.NotificationUncheckedCreateInput) {
    await this.prisma.notification.create({ data });
  }

  async create(projectId: string, userId: string, dto: CreateTaskDto) {
    const project = await this.assertProjectAccess(projectId, userId);
    this.assertAssigneeInTeam(dto.assigneeId, project.team.members);
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (lastTask?.position ?? -1) + 1;
    const task = await this.prisma.task.create({
      data: {
        ...dto,
        dueDate: this.toDate(dto.dueDate),
        projectId,
        creatorId: userId,
        position,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    if (task.assigneeId && task.assigneeId !== userId) {
      await this.notify({
        userId: task.assigneeId,
        taskId: task.id,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        message: `You were assigned "${task.title}" in ${project.name}`,
      });
    }
    return task;
  }

  async findByProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findOne(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        project: { include: { team: { include: { members: true } } } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    const isMember = task.project.team.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Access denied');
    return task;
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { include: { team: { include: { members: true } } } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    const isMember = task.project.team.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Access denied');
    this.assertAssigneeInTeam(dto.assigneeId, task.project.team.members);

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { ...dto, dueDate: this.toDate(dto.dueDate) },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    if (
      dto.assigneeId &&
      dto.assigneeId !== task.assigneeId &&
      dto.assigneeId !== userId
    ) {
      await this.notify({
        userId: dto.assigneeId,
        taskId,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        message: `You were assigned "${updated.title}" in ${task.project.name}`,
      });
    }
    if (
      dto.status &&
      dto.status !== task.status &&
      updated.assigneeId &&
      updated.assigneeId !== userId
    ) {
      await this.notify({
        userId: updated.assigneeId,
        taskId,
        type: 'TASK_STATUS_CHANGED',
        title: 'Task status changed',
        message: `"${updated.title}" moved to ${dto.status.replace('_', ' ')}`,
      });
    }
    return updated;
  }

  async remove(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { include: { team: { include: { members: true } } } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    const member = task.project.team.members.find((m) => m.userId === userId);
    if (!member) throw new ForbiddenException('Access denied');
    if (task.creatorId !== userId && member.role === 'DEVELOPER') {
      throw new ForbiddenException(
        'Only the creator, managers or admins can delete tasks',
      );
    }
    await this.prisma.task.delete({ where: { id: taskId } });
    return { message: 'Task deleted successfully' };
  }

  async getMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId, status: { not: TaskStatus.DONE } },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }
}
