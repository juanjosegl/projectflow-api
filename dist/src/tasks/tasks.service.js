"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let TasksService = class TasksService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertProjectAccess(projectId, userId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { team: { include: { members: true } } },
        });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const isMember = project.team.members.some((m) => m.userId === userId);
        if (!isMember)
            throw new common_1.ForbiddenException('Access denied');
        return project;
    }
    assertAssigneeInTeam(assigneeId, members) {
        if (assigneeId && !members.some((m) => m.userId === assigneeId)) {
            throw new common_1.BadRequestException('Assignee must be a member of the project team');
        }
    }
    toDate(value) {
        if (value === undefined)
            return undefined;
        return value === null ? null : new Date(value);
    }
    async notify(data) {
        await this.prisma.notification.create({ data });
    }
    async create(projectId, userId, dto) {
        const project = await this.assertProjectAccess(projectId, userId);
        this.assertAssigneeInTeam(dto.assigneeId, project.team.members);
        const lastTask = await this.prisma.task.findFirst({
            where: { projectId },
            orderBy: { position: 'desc' },
            select: { position: true },
        });
        const position = (lastTask?.position ?? -1) + 1;
        const task = await this.prisma.task.create({
            data: { ...dto, dueDate: this.toDate(dto.dueDate), projectId, creatorId: userId, position },
            include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                creator: { select: { id: true, name: true } },
            },
        });
        if (task.assigneeId && task.assigneeId !== userId) {
            await this.notify({
                userId: task.assigneeId, taskId: task.id, type: 'TASK_ASSIGNED',
                title: 'New task assigned', message: `You were assigned "${task.title}" in ${project.name}`,
            });
        }
        return task;
    }
    async findByProject(projectId, userId) {
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
    async findOne(taskId, userId) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                creator: { select: { id: true, name: true } },
                comments: {
                    include: { author: { select: { id: true, name: true, avatar: true } } },
                    orderBy: { createdAt: 'asc' },
                },
                project: { include: { team: { include: { members: true } } } },
            },
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const isMember = task.project.team.members.some((m) => m.userId === userId);
        if (!isMember)
            throw new common_1.ForbiddenException('Access denied');
        return task;
    }
    async update(taskId, userId, dto) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: { include: { team: { include: { members: true } } } } },
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const isMember = task.project.team.members.some((m) => m.userId === userId);
        if (!isMember)
            throw new common_1.ForbiddenException('Access denied');
        this.assertAssigneeInTeam(dto.assigneeId, task.project.team.members);
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: { ...dto, dueDate: this.toDate(dto.dueDate) },
            include: { assignee: { select: { id: true, name: true, avatar: true } } },
        });
        if (dto.assigneeId && dto.assigneeId !== task.assigneeId && dto.assigneeId !== userId) {
            await this.notify({
                userId: dto.assigneeId, taskId, type: 'TASK_ASSIGNED',
                title: 'New task assigned', message: `You were assigned "${updated.title}" in ${task.project.name}`,
            });
        }
        if (dto.status && dto.status !== task.status && updated.assigneeId && updated.assigneeId !== userId) {
            await this.notify({
                userId: updated.assigneeId, taskId, type: 'TASK_STATUS_CHANGED',
                title: 'Task status changed', message: `"${updated.title}" moved to ${dto.status.replace('_', ' ')}`,
            });
        }
        return updated;
    }
    async remove(taskId, userId) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: { include: { team: { include: { members: true } } } } },
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const member = task.project.team.members.find((m) => m.userId === userId);
        if (!member)
            throw new common_1.ForbiddenException('Access denied');
        if (task.creatorId !== userId && member.role === 'DEVELOPER') {
            throw new common_1.ForbiddenException('Only the creator, managers or admins can delete tasks');
        }
        await this.prisma.task.delete({ where: { id: taskId } });
        return { message: 'Task deleted successfully' };
    }
    async getMyTasks(userId) {
        return this.prisma.task.findMany({
            where: { assigneeId: userId, status: { not: client_1.TaskStatus.DONE } },
            include: {
                project: { select: { id: true, name: true } },
                _count: { select: { comments: true } },
            },
            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        });
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map