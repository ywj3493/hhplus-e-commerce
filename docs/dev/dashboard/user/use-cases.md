# User Domain - Use Cases

**버전**: 1.0.0
**최종 수정**: 2025-11-20
**상태**: Active
**제품**: Dashboard

---

## 문서 네비게이션

**상위**: [← Requirements](../requirements.md)
**관련**: [API 명세서](../api-specification.md) | [시퀀스 다이어그램](sequence-diagrams.md)

---

## 목차

1. [개요](#개요)
2. [범위 (Scope)](#범위-scope)
3. [UC-USER-01: 사용자 정보 조회](#uc-user-01-사용자-정보-조회)

---

## 개요

본 문서는 User 도메인의 Use Case를 정의합니다. User 도메인은 사용자 정보 관리를 담당하며, Dashboard 제품에서는 **사용자 정보 조회 기능만** 제공합니다.

### 설계 원칙

- **도메인 분리**: 사용자 정보 관리와 인증/인가는 분리됨
- **최소 기능**: Dashboard 제품은 읽기 전용 기능만 제공
- **확장성**: 향후 Admin 제품에서 관리 기능 추가 예정

---

## 범위 (Scope)

### Dashboard 제품 (현재)

**포함**:
- 사용자 정보 조회 (본인만)

**제외**:
- 사용자 등록/가입
- 사용자 정보 수정
- 사용자 목록 조회
- 사용자 삭제
- 인증/로그인 (별도 Auth 영역에서 관리)

### Admin 제품 (향후)

**포함 예정**:
- 사용자 목록 조회
- 사용자 상세 조회
- 사용자 생성
- 사용자 정보 수정
- 사용자 삭제

> **참고**: Admin 제품의 요구사항은 `/docs/dev/admin/requirements.md`에 별도 정의될 예정입니다.

---

## UC-USER-01: 사용자 정보 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| **Use Case ID** | UC-USER-01 |
| **Use Case 명** | 사용자 정보 조회 (Get User Profile) |
| **액터** | 인증된 고객 (Authenticated Customer) |
| **관련 요구사항** | [FR-USER-01](../requirements.md#fr-user-01-사용자-정보-조회), [FR-USER-02](../requirements.md#fr-user-02-인증-제한) |
| **관련 스토리** | [US-USER-01](../user-stories.md#us-user-01-사용자-정보-조회) |
| **우선순위** | MUST |

### 개요

인증된 사용자가 자신의 프로필 정보를 조회하는 기능입니다.

### 사전 조건 (Preconditions)

1. 사용자가 유효한 인증 토큰(Master Token)을 보유하고 있음
2. 사용자가 시스템에 등록되어 있음

### 사후 조건 (Postconditions)

**성공 시**:
- 사용자 프로필 정보가 반환됨
- 조회 로그가 기록됨 (선택)

**실패 시**:
- 적절한 에러 메시지가 반환됨
- 시스템 상태는 변경되지 않음

### 주요 흐름 (Main Flow)

1. **사용자**: API 엔드포인트 `GET /api/users/me`에 요청을 보냄
   - Authorization 헤더에 Master Token 포함

2. **시스템**: Authorization 헤더에서 토큰을 추출함

3. **시스템**: FakeAuthGuard가 토큰을 검증함
   - TOKEN_USER_MAP에서 토큰에 해당하는 userId 조회
   - 유효하지 않은 토큰이면 **대안 흐름 3a**로 이동

4. **시스템**: 추출된 userId로 GetUserProfileUseCase를 실행함

5. **시스템**: UserRepository를 통해 사용자 정보를 조회함
   - 사용자가 존재하지 않으면 **대안 흐름 5a**로 이동

6. **시스템**: 조회된 User 엔티티를 GetUserProfileOutput DTO로 변환함

7. **시스템**: UserResponseDto로 최종 변환하여 반환함

8. **사용자**: 프로필 정보를 받음 (id, name, email, createdAt)

### 대안 흐름 (Alternative Flows)

#### 3a. 유효하지 않은 토큰

**조건**: Authorization 헤더가 없거나 유효하지 않은 토큰인 경우

1. **시스템**: FakeAuthGuard가 UnauthorizedException을 발생시킴
2. **시스템**: 401 Unauthorized 응답을 반환함
   ```json
   {
     "statusCode": 401,
     "message": "유효하지 않은 토큰입니다"
   }
   ```
3. Use Case 종료

#### 5a. 사용자를 찾을 수 없음

**조건**: 토큰은 유효하지만 해당 userId를 가진 사용자가 DB에 없는 경우

1. **시스템**: UserRepository.findById()가 null을 반환함
2. **시스템**: GetUserProfileUseCase가 UserNotFoundException을 발생시킴
3. **시스템**: 404 Not Found 응답을 반환함
   ```json
   {
     "statusCode": 404,
     "message": "사용자를 찾을 수 없습니다"
   }
   ```
4. Use Case 종료

### 비즈니스 규칙 (Business Rules)

- **BR-USER-01**: 사용자는 본인의 정보만 조회할 수 있음
  - 토큰에서 추출된 userId와 조회 대상이 동일해야 함
  - GET /api/users/me는 항상 본인 정보만 조회

- **BR-USER-02**: 모든 사용자 정보 조회는 인증이 필수임
  - 인증되지 않은 요청은 401 Unauthorized 반환

- **BR-USER-03**: 인증은 Master Token 방식을 사용함 (임시)
  - 향후 JWT 기반 인증으로 전환 예정

### 비기능 요구사항 (Non-Functional Requirements)

| 항목 | 요구사항 | 목표 값 |
|------|---------|--------|
| **성능** | 평균 응답 시간 | < 100ms |
| **보안** | 본인 정보만 조회 | 토큰 기반 검증 |
| **가용성** | 서비스 가용성 | 99.9% |
| **동시성** | 동시 조회 요청 처리 | 1000 req/s |

### 데이터 명세

#### Input (GetUserProfileInput)

```typescript
class GetUserProfileInput {
  userId: string;  // 토큰에서 추출된 사용자 ID (UUID)
}
```

#### Output (GetUserProfileOutput)

```typescript
class GetUserProfileOutput {
  id: string;           // 사용자 ID (UUID)
  name: string;         // 사용자 이름
  email: string | null; // 이메일 주소 (NULL 가능)
  createdAt: Date;      // 계정 생성일시
}
```

#### HTTP Response (UserResponseDto)

```typescript
interface UserResponseDto {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;  // ISO 8601 형식
}
```

### 시퀀스 다이어그램

상세한 시퀀스 다이어그램은 [sequence-diagrams.md](sequence-diagrams.md#sd-user-01-사용자-정보-조회)를 참조하세요.

### 테스트 시나리오

#### 시나리오 1: 정상 조회

**Given**:
- 유효한 Master Token: `test-master-token-12345`
- 해당 토큰은 `user-uuid-1` (홍길동)과 매핑됨
- DB에 홍길동 사용자 정보 존재

**When**:
```bash
GET /api/users/me
Authorization: Bearer test-master-token-12345
```

**Then**:
- HTTP 200 OK
- Response Body:
  ```json
  {
    "id": "user-uuid-1",
    "name": "홍길동",
    "email": "hong@example.com",
    "createdAt": "2025-01-15T10:00:00Z"
  }
  ```

#### 시나리오 2: 토큰 없음

**Given**:
- Authorization 헤더가 없는 요청

**When**:
```bash
GET /api/users/me
```

**Then**:
- HTTP 401 Unauthorized
- Response Body:
  ```json
  {
    "statusCode": 401,
    "message": "토큰이 필요합니다"
  }
  ```

#### 시나리오 3: 유효하지 않은 토큰

**Given**:
- 잘못된 Master Token: `invalid-token`

**When**:
```bash
GET /api/users/me
Authorization: Bearer invalid-token
```

**Then**:
- HTTP 401 Unauthorized
- Response Body:
  ```json
  {
    "statusCode": 401,
    "message": "유효하지 않은 토큰입니다"
  }
  ```

#### 시나리오 4: 사용자 미존재

**Given**:
- 유효한 토큰이지만 매핑된 userId가 DB에 없음
- 예: 토큰은 'user-uuid-999'를 가리키지만 해당 사용자 삭제됨

**When**:
```bash
GET /api/users/me
Authorization: Bearer valid-but-deleted-user-token
```

**Then**:
- HTTP 404 Not Found
- Response Body:
  ```json
  {
    "statusCode": 404,
    "message": "사용자를 찾을 수 없습니다"
  }
  ```

### 구현 노트

#### Master Token 매핑 (임시)

```typescript
// src/__fake__/auth/master-token.ts
export const MASTER_TOKEN = 'test-master-token-12345';

export interface TokenPayload {
  userId: string;
}

export const TOKEN_USER_MAP: Record<string, TokenPayload> = {
  [MASTER_TOKEN]: { userId: 'user-uuid-1' },
  'test-token-user2': { userId: 'user-uuid-2' },
  'test-token-user3': { userId: 'user-uuid-3' },
};
```

#### FakeAuthGuard 검증 로직

```typescript
// src/__fake__/auth/auth.guard.ts
@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('토큰이 필요합니다');
    }

    const token = authHeader.substring(7);
    const payload = TOKEN_USER_MAP[token];

    if (!payload) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    request.user = payload;
    return true;
  }
}
```

#### Use Case 구현

```typescript
// src/user/application/use-cases/get-user-profile.use-case.ts
@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: GetUserProfileInput): Promise<GetUserProfileOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundException(input.userId);
    }

    return GetUserProfileOutput.from(user);
  }
}
```

### 향후 전환 계획

#### JWT 기반 인증으로 전환 시

**변경 사항**:
1. `FakeAuthGuard` → `JwtAuthGuard` 교체
2. `TOKEN_USER_MAP` → JWT 토큰 검증 로직으로 대체
3. `master-token.ts` 파일 제거

**영향 범위**:
- User domain 코드는 변경 불필요 (Guard만 교체)
- GetUserProfileUseCase는 그대로 유지
- Controller의 @UseGuards만 변경

**예시**:
```typescript
@Controller('users')
export class UserController {
  @Get('me')
  @UseGuards(JwtAuthGuard)  // FakeAuthGuard → JwtAuthGuard
  async getMyProfile(@Request() req): Promise<UserResponseDto> {
    // req.user.userId는 동일하게 사용 가능
    const input = new GetUserProfileInput(req.user.userId);
    const output = await this.getUserProfileUseCase.execute(input);
    return UserResponseDto.from(output);
  }
}
```

---

## 관련 문서

- **Requirements**: [요구사항 분석](../requirements.md)
- **User Stories**: [사용자 스토리](../user-stories.md#us-user-01-사용자-정보-조회)
- **API Specification**: [API 명세서](../api-specification.md#61-get-usersme)
- **Data Model**: [데이터 모델](../data-model.md#1-user-사용자)
- **Sequence Diagrams**: [시퀀스 다이어그램](sequence-diagrams.md)
- **Issue**: [Issue #013](../../issue/issue013.md)

---

**버전 이력**:
- 1.0.0 (2025-11-20): 초기 문서 작성
  - UC-USER-01: 사용자 정보 조회 정의
  - Master Token 인증 방식 명세
  - Dashboard 제품 범위 정의
