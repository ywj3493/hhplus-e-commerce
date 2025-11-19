export interface RemoveCartItemInputData {
  userId: string;
  cartItemId: string;
}

export class RemoveCartItemInput {
  userId: string;
  cartItemId: string;

  constructor(data: RemoveCartItemInputData) {
    this.userId = data.userId;
    this.cartItemId = data.cartItemId;
  }
}

export class RemoveCartItemOutput {
  success: boolean;
  message: string;

  constructor(success: boolean, message: string) {
    this.success = success;
    this.message = message;
  }

  static success(): RemoveCartItemOutput {
    return new RemoveCartItemOutput(true, '아이템이 삭제되었습니다.');
  }
}
