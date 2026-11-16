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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('tasks/mine')
  @ApiOperation({ summary: 'Get my assigned tasks' })
  getMyTasks(@CurrentUser() user: AuthUser) {
    return this.tasksService.getMyTasks(user.id);
  }

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create a task in a project' })
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, user.id, dto);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Get all tasks in a project' })
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.findByProject(projectId, user.id);
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get task details' })
  findOne(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.findOne(taskId, user.id);
  }

  @Patch('tasks/:taskId')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(taskId, user.id, dto);
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.remove(taskId, user.id);
  }
}
