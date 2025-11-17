import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

export class CartNotFoundException extends NotFoundException {
  constructor(message: string = '장바구니를 찾을 수 없습니다.') {
    super(message);
  }
}

export class CartItemNotFoundException extends NotFoundException {
  constructor(message: string = '장바구니 아이템을 찾을 수 없습니다.') {
    super(message);
  }
}

export class InsufficientStockException extends ConflictException {
  constructor(message: string = '재고가 부족합니다.') {
    super(message);
  }
}

export class InvalidQuantityException extends BadRequestException {
  constructor(message: string = '수량은 1 이상이어야 합니다.') {
    super(message);
  }
}
