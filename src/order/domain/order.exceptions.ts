/**
 * Order 도메인 예외 계층 구조
 *
 * OrderDomainException (기본 클래스)
 * ├── CartDomainException (장바구니 관련)
 * │   ├── CartNotFoundException
 * │   ├── CartItemNotFoundException
 * │   ├── EmptyCartException
 * │   └── InsufficientStockException
 * ├── OrderProcessException (주문 관련)
 * │   ├── OrderNotFoundException
 * │   ├── OrderAlreadyCompletedException
 * │   ├── OrderExpiredException
 * │   ├── InvalidOrderStateException
 * │   ├── MinimumOrderAmountException
 * │   └── OrderOwnershipException
 * ├── PaymentDomainException (결제 관련)
 * │   ├── PaymentApiException
 * │   ├── PaymentFailedException
 * │   ├── AlreadyPaidException
 * │   └── InvalidOrderStatusException
 * └── ValidationException (검증 관련)
 *     └── InvalidQuantityException
 */

/**
 * Order 도메인의 최상위 예외 클래스
 */
export class OrderDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderDomainException';
  }
}

// ============================================================================
// Cart 관련 예외들
// ============================================================================

/**
 * Cart 도메인 예외 기본 클래스
 */
export class CartDomainException extends OrderDomainException {
  constructor(message: string) {
    super(message);
    this.name = 'CartDomainException';
  }
}

/**
 * 장바구니를 찾을 수 없음
 */
export class CartNotFoundException extends CartDomainException {
  constructor(message: string = '장바구니를 찾을 수 없습니다.') {
    super(message);
    this.name = 'CartNotFoundException';
  }
}

/**
 * 장바구니 아이템을 찾을 수 없음
 */
export class CartItemNotFoundException extends CartDomainException {
  constructor(message: string = '장바구니 아이템을 찾을 수 없습니다.') {
    super(message);
    this.name = 'CartItemNotFoundException';
  }
}

/**
 * 장바구니가 비어있음
 */
export class EmptyCartException extends CartDomainException {
  constructor(message: string = '장바구니가 비어있습니다.') {
    super(message);
    this.name = 'EmptyCartException';
  }
}

/**
 * 재고 부족
 */
export class InsufficientStockException extends CartDomainException {
  constructor(message: string = '재고가 부족합니다.') {
    super(message);
    this.name = 'InsufficientStockException';
  }
}

// ============================================================================
// Order 관련 예외들
// ============================================================================

/**
 * Order 프로세스 예외 기본 클래스
 */
export class OrderProcessException extends OrderDomainException {
  constructor(message: string) {
    super(message);
    this.name = 'OrderProcessException';
  }
}

/**
 * 주문을 찾을 수 없음
 */
export class OrderNotFoundException extends OrderProcessException {
  constructor(message: string = '주문을 찾을 수 없습니다.') {
    super(message);
    this.name = 'OrderNotFoundException';
  }
}

/**
 * 이미 완료된 주문
 */
export class OrderAlreadyCompletedException extends OrderProcessException {
  constructor(message: string = '이미 완료된 주문입니다.') {
    super(message);
    this.name = 'OrderAlreadyCompletedException';
  }
}

/**
 * 주문 예약 시간이 만료됨 (10분)
 */
export class OrderExpiredException extends OrderProcessException {
  constructor(message: string = '주문 예약 시간이 만료되었습니다.') {
    super(message);
    this.name = 'OrderExpiredException';
  }
}

/**
 * 잘못된 주문 상태
 */
export class InvalidOrderStateException extends OrderProcessException {
  constructor(message: string = '잘못된 주문 상태입니다.') {
    super(message);
    this.name = 'InvalidOrderStateException';
  }
}

/**
 * 최소 주문 금액 미달
 */
export class MinimumOrderAmountException extends OrderProcessException {
  constructor(message: string = '최종 금액은 0보다 커야 합니다.') {
    super(message);
    this.name = 'MinimumOrderAmountException';
  }
}

/**
 * 주문 소유권 불일치
 */
export class OrderOwnershipException extends OrderProcessException {
  constructor(message: string = '본인의 주문만 조회할 수 있습니다.') {
    super(message);
    this.name = 'OrderOwnershipException';
  }
}

// ============================================================================
// Payment 관련 예외들
// ============================================================================

/**
 * Payment 도메인 예외의 기본 클래스
 */
export class PaymentDomainException extends OrderDomainException {
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
 * 잘못된 주문 상태 (결제용)
 */
export class InvalidOrderStatusException extends PaymentDomainException {
  constructor(message: string = '대기 중인 주문만 결제할 수 있습니다.') {
    super(message);
    this.name = 'InvalidOrderStatusException';
  }
}

// ============================================================================
// Validation 관련 예외들
// ============================================================================

/**
 * 검증 예외 기본 클래스
 */
export class ValidationException extends OrderDomainException {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationException';
  }
}

/**
 * 잘못된 수량
 */
export class InvalidQuantityException extends ValidationException {
  constructor(message: string = '수량은 1개 이상이어야 합니다.') {
    super(message);
    this.name = 'InvalidQuantityException';
  }
}
