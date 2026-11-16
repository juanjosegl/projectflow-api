import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe as describeError } from './http-exception.filter';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: 'test',
  });

describe('AllExceptionsFilter error mapping', () => {
  it('keeps the status and message of HTTP exceptions', () => {
    expect(describeError(new NotFoundException('Task not found'))).toEqual({
      status: 404,
      message: 'Task not found',
    });
  });

  it('passes validation messages through as a list', () => {
    const error = new BadRequestException(['title should not be empty']);
    expect(describeError(error)).toEqual({
      status: 400,
      message: ['title should not be empty'],
    });
  });

  it.each([
    ['P2002', 409],
    ['P2003', 400],
    ['P2025', 404],
  ])('maps Prisma %s to %i', (code, status) => {
    expect(describeError(prismaError(code)).status).toBe(status);
  });

  it('hides the details of unexpected errors', () => {
    expect(describeError(new Error('connection string leaked'))).toEqual({
      status: 500,
      message: 'Internal server error',
    });
    expect(describeError(prismaError('P1001')).status).toBe(500);
  });
});
