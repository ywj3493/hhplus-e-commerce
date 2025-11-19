/**
 * Payment 도메인 예외의 기본 클래스
 */
export class PaymentDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentDomainException';
  }
}

/**
 * 외부 결제 API 호출 실패
 */
export class PaymentApiException extends PaymentDomainException {
  constructor(message: string = '결제 API 호출에 실패했습니다.') {
    super(message);
    this.name = 'PaymentApiException';
  }
}

/**
 * 결제 처리 실패
 */
export class PaymentFailedException extends PaymentDomainException {
  constructor(message: string = '결제 처리에 실패했습니다.') {
    super(message);
    this.name = 'PaymentFailedException';
  }
}

/**
 * 이미 결제 완료된 주문
 */
export class AlreadyPaidException extends PaymentDomainException {
  constructor(message: string = '이미 결제 완료된 주문입니다.') {
    super(message);
    this.name = 'AlreadyPaidException';
  }
}

/**
 * 주문 예약 만료
 */
export class OrderExpiredException extends PaymentDomainException {
  constructor(message: string = '주문 예약 시간이 만료되었습니다.') {
    super(message);
    this.name = 'OrderExpiredException';
  }
}

/**
 * 잘못된 주문 상태
 */
export class InvalidOrderStatusException extends PaymentDomainException {
  constructor(message: string = '대기 중인 주문만 결제할 수 있습니다.') {
    super(message);
    this.name = 'InvalidOrderStatusException';
  }
}
