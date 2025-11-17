import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

/**
 * 쿠폰을 찾을 수 없을 때 발생하는 예외
 */
export class CouponNotFoundException extends NotFoundException {
  constructor(message: string = '쿠폰을 찾을 수 없습니다.') {
    super(message);
  }
}

/**
 * 쿠폰이 모두 소진되었을 때 발생하는 예외
 */
export class CouponExhaustedException extends ConflictException {
  constructor(message: string = '쿠폰이 모두 소진되었습니다.') {
    super(message);
  }
}

/**
 * 이미 발급받은 쿠폰일 때 발생하는 예외
 */
export class CouponAlreadyIssuedException extends ConflictException {
  constructor(message: string = '이미 발급받은 쿠폰입니다.') {
    super(message);
  }
}

/**
 * 쿠폰 발급 기간이 아닐 때 발생하는 예외
 */
export class CouponExpiredException extends BadRequestException {
  constructor(message: string = '쿠폰 발급 기간이 아닙니다.') {
    super(message);
  }
}

/**
 * 이미 사용된 쿠폰일 때 발생하는 예외
 */
export class CouponAlreadyUsedException extends BadRequestException {
  constructor(message: string = '이미 사용된 쿠폰입니다.') {
    super(message);
  }
}
