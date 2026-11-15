import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getMyStats(user: {
        id: string;
    }): Promise<{
        tasksByStatus: {
            status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
            count: number;
        }[];
        completedThisWeek: number;
        overdueTasksCount: number;
        teamsCount: number;
        recentActivity: ({
            project: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            status: import(".prisma/client").$Enums.TaskStatus;
            projectId: string;
            title: string;
            priority: import(".prisma/client").$Enums.TaskPriority;
            assigneeId: string | null;
            dueDate: Date | null;
            position: number;
            creatorId: string;
        })[];
    }>;
    getTeamStats(teamId: string, user: {
        id: string;
    }): Promise<{
        totalTasks: number;
        tasksByStatus: {
            status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
            count: number;
        }[];
        tasksByPriority: {
            priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
            count: number;
        }[];
        membersCount: number;
        projectsCount: number;
        topContributors: {
            user: {
                id: string;
                name: string;
                avatar: string;
            };
            tasksCompleted: number;
        }[];
    }>;
}
