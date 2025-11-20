import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * 사용자를 찾을 수 없을 때 발생하는 예외
 */
export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`사용자를 찾을 수 없습니다: ${userId}`);
  }
}

/**
 * 유효하지 않은 사용자 데이터일 때 발생하는 예외
 */
export class InvalidUserDataException extends BadRequestException {
  constructor(message: string) {
    super(`유효하지 않은 사용자 데이터: ${message}`);
  }
}
