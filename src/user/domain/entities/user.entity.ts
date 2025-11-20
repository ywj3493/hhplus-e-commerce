/**
 * User Entity
 * User 도메인의 애그리거트 루트
 * BR-USER-01: 사용자는 본인의 정보만 조회 가능
 */
export class User {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _email: string | null;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: string,
    name: string,
    email: string | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._name = name;
    this._email = email;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * DB에서 조회한 데이터로부터 User 엔티티를 재구성합니다.
   * @param data - DB 조회 결과
   */
  static reconstitute(data: {
    id: string;
    name: string;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      data.id,
      data.name,
      data.email,
      data.createdAt,
      data.updatedAt,
    );
  }

  /**
   * 비즈니스 규칙을 검증합니다.
   */
  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('사용자 ID는 필수입니다');
    }

    if (!this._name || this._name.trim() === '') {
      throw new Error('사용자 이름은 필수입니다');
    }

    if (this._name.length > 100) {
      throw new Error('사용자 이름은 100자를 초과할 수 없습니다');
    }

    if (this._email && this._email.length > 255) {
      throw new Error('이메일은 255자를 초과할 수 없습니다');
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string | null {
    return this._email;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
