import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMyStats(userId: string) {
    const [
      assignedTasks,
      completedThisWeek,
      overdueTasksCount,
      myTeams,
      recentActivity,
    ] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { assigneeId: userId },
        _count: { status: true },
      }),
      this.prisma.task.count({
        where: {
          assigneeId: userId,
          status: TaskStatus.DONE,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.task.count({
        where: {
          assigneeId: userId,
          status: { not: TaskStatus.DONE },
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.teamMember.count({ where: { userId } }),
      this.prisma.task.findMany({
        where: { assigneeId: userId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const tasksByStatus = Object.values(TaskStatus).map((status) => ({
      status,
      count: assignedTasks.find((t) => t.status === status)?._count.status ?? 0,
    }));

    return {
      tasksByStatus,
      completedThisWeek,
      overdueTasksCount,
      teamsCount: myTeams,
      recentActivity,
    };
  }

  async getTeamStats(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this team');

    const [
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      membersCount,
      projectsCount,
      topContributors,
    ] = await Promise.all([
      this.prisma.task.count({ where: { project: { teamId } } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { project: { teamId } },
        _count: { status: true },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { project: { teamId } },
        _count: { priority: true },
      }),
      this.prisma.teamMember.count({ where: { teamId } },),
      this.prisma.project.count({ where: { teamId } }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: { project: { teamId }, status: TaskStatus.DONE, assigneeId: { not: null } },
        _count: { assigneeId: true },
        orderBy: { _count: { assigneeId: 'desc' } },
        take: 5,
      }),
    ]);

    const statusStats = Object.values(TaskStatus).map((status) => ({
      status,
      count: tasksByStatus.find((t) => t.status === status)?._count.status ?? 0,
    }));

    const priorityStats = Object.values(TaskPriority).map((priority) => ({
      priority,
      count: tasksByPriority.find((t) => t.priority === priority)?._count.priority ?? 0,
    }));

    // Enrich top contributors with user data
    const users = await this.prisma.user.findMany({
      where: { id: { in: topContributors.map((c) => c.assigneeId!) } },
      select: { id: true, name: true, avatar: true },
    });
    const enrichedContributors = topContributors.map((c) => ({
      user: users.find((u) => u.id === c.assigneeId) ?? null,
      tasksCompleted: c._count.assigneeId,
    }));

    return {
      totalTasks,
      tasksByStatus: statusStats,
      tasksByPriority: priorityStats,
      membersCount,
      projectsCount,
      topContributors: enrichedContributors,
    };
  }
}
