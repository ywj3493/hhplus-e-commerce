/**
 * 주문을 찾을 수 없음
 */
export class OrderNotFoundException extends Error {
  constructor(message: string = '주문을 찾을 수 없습니다.') {
    super(message);
    this.name = 'OrderNotFoundException';
  }
}

/**
 * 장바구니가 비어있음
 */
export class EmptyCartException extends Error {
  constructor(message: string = '장바구니가 비어있습니다.') {
    super(message);
    this.name = 'EmptyCartException';
  }
}

/**
 * 이미 완료된 주문
 */
export class OrderAlreadyCompletedException extends Error {
  constructor(message: string = '이미 완료된 주문입니다.') {
    super(message);
    this.name = 'OrderAlreadyCompletedException';
  }
}

/**
 * 주문 예약 시간이 만료됨
 */
export class OrderExpiredException extends Error {
  constructor(message: string = '주문 예약 시간이 만료되었습니다.') {
    super(message);
    this.name = 'OrderExpiredException';
  }
}

/**
 * 잘못된 주문 상태
 */
export class InvalidOrderStateException extends Error {
  constructor(message: string = '잘못된 주문 상태입니다.') {
    super(message);
    this.name = 'InvalidOrderStateException';
  }
}

/**
 * 최소 주문 금액 미달
 */
export class MinimumOrderAmountException extends Error {
  constructor(message: string = '최종 금액은 0보다 커야 합니다.') {
    super(message);
    this.name = 'MinimumOrderAmountException';
  }
}

/**
 * 주문 소유권 불일치
 */
export class OrderOwnershipException extends Error {
  constructor(message: string = '본인의 주문만 조회할 수 있습니다.') {
    super(message);
    this.name = 'OrderOwnershipException';
  }
}
