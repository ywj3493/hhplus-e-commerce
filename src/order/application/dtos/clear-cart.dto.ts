export class ClearCartInput {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}

export class ClearCartOutput {
  success: boolean;
  message: string;
  deletedCount: number;

  constructor(success: boolean, message: string, deletedCount: number) {
    this.success = success;
    this.message = message;
    this.deletedCount = deletedCount;
  }

  static success(deletedCount: number): ClearCartOutput {
    return new ClearCartOutput(true, '장바구니가 비워졌습니다.', deletedCount);
  }
}
