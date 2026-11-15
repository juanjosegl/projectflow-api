import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
export declare class TeamsController {
    private teamsService;
    constructor(teamsService: TeamsService);
    create(user: {
        id: string;
    }, dto: CreateTeamDto): Promise<{
        members: ({
            user: {
                id: string;
                email: string;
                name: string;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.Role;
            joinedAt: Date;
            userId: string;
            teamId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
    }>;
    findMyTeams(user: {
        id: string;
    }): Promise<({
        members: ({
            user: {
                id: string;
                name: string;
                avatar: string;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.Role;
            joinedAt: Date;
            userId: string;
            teamId: string;
        })[];
        _count: {
            members: number;
            projects: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
    })[]>;
    getMyInvitations(user: {
        id: string;
    }): Promise<({
        team: {
            id: string;
            name: string;
            description: string;
        };
        sender: {
            id: string;
            name: string;
            avatar: string;
        };
    } & {
        id: string;
        email: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        teamId: string;
        status: import(".prisma/client").$Enums.InvitationStatus;
        token: string;
        expiresAt: Date;
        senderId: string;
    })[]>;
    findOne(teamId: string, user: {
        id: string;
    }): Promise<{
        members: ({
            user: {
                id: string;
                email: string;
                name: string;
                avatar: string;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.Role;
            joinedAt: Date;
            userId: string;
            teamId: string;
        })[];
        projects: {
            id: string;
            name: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ProjectStatus;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
    }>;
    invite(teamId: string, user: {
        id: string;
    }, dto: InviteMemberDto): Promise<{
        message: string;
        id: string;
        email: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        teamId: string;
        status: import(".prisma/client").$Enums.InvitationStatus;
        token: string;
        expiresAt: Date;
        senderId: string;
    }>;
    getInvitation(token: string): Promise<{
        team: {
            name: string;
        };
        email: string;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.InvitationStatus;
        expiresAt: Date;
        sender: {
            name: string;
        };
    }>;
    acceptInvitation(token: string, user: {
        id: string;
    }): Promise<{
        message: string;
        teamId: string;
        teamName: string;
    }>;
    declineInvitation(token: string, user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
    leave(teamId: string, user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
    updateRole(teamId: string, memberId: string, user: {
        id: string;
    }, dto: UpdateMemberRoleDto): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.Role;
        joinedAt: Date;
        userId: string;
        teamId: string;
    }>;
    removeMember(teamId: string, memberId: string, user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
}
