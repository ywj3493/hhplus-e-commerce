/**
 * Category Entity
 * 상품 카테고리를 나타냄
 */
export class Category {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: string,
    name: string,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._name = name;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * Category 인스턴스를 생성하는 팩토리 메서드
   */
  static create(
    id: string,
    name: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ): Category {
    return new Category(id, name, createdAt, updatedAt);
  }

  /**
   * 영속화된 데이터로부터 Category를 재구성하는 팩토리 메서드
   */
  static reconstitute(
    id: string,
    name: string,
    createdAt: Date,
    updatedAt: Date,
  ): Category {
    return new Category(id, name, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('카테고리 ID는 필수입니다');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('카테고리명은 필수입니다');
    }
    if (this._name.length > 100) {
      throw new Error('카테고리명은 100자를 초과할 수 없습니다');
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
