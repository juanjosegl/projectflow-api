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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  create(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(taskId, user.id, dto);
  }

  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  findByTask(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.commentsService.findByTask(taskId, user.id);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.update(commentId, user.id, dto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('commentId') commentId: string, @CurrentUser() user: AuthUser) {
    return this.commentsService.remove(commentId, user.id);
  }
}
