import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { memoryStorage } from 'multer';

// SVG is excluded on purpose: it can carry scripts.
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private prisma: PrismaService) {}

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        if (!AVATAR_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Avatar must be a PNG, JPEG, WebP or GIF image',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { avatar: base64 },
    });
    return { avatar: base64 };
  }
}
