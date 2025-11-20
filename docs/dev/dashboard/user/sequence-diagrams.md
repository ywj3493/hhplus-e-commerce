# User Domain - Sequence Diagrams

**버전**: 1.0.0
**최종 수정**: 2025-11-20
**상태**: Active
**제품**: Dashboard

---

## 문서 네비게이션

**상위**: [← Requirements](../requirements.md)
**관련**: [Use Cases](use-cases.md) | [API 명세서](../api-specification.md)

---

## 목차

1. [개요](#개요)
2. [다이어그램 범례](#다이어그램-범례)
3. [SD-USER-01: 사용자 정보 조회](#sd-user-01-사용자-정보-조회)

---

## 개요

본 문서는 User 도메인의 시퀀스 다이어그램을 정의합니다. 각 다이어그램은 Use Case의 상세 흐름을 시각화하며, 레이어 간 상호작용을 명확히 보여줍니다.

### 아키텍처 레이어

User 도메인은 다음과 같은 레이어로 구성됩니다:

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│  - UserController                       │
│  - UserResponseDto                      │
│  - FakeAuthGuard (임시, Auth 영역)     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Application Layer                      │
│  - GetUserProfileUseCase                │
│  - GetUserProfileInput/Output           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Domain Layer                           │
│  - User Entity                          │
│  - UserRepository Interface             │
│  - UserNotFoundException                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Infrastructure Layer                   │
│  - InMemoryUserRepository               │
│  - User Fixtures                        │
└─────────────────────────────────────────┘
```

---

## 다이어그램 범례

### 참여자 (Participants)

| 참여자 | 설명 | 레이어 |
|-------|------|--------|
| **Client** | HTTP 클라이언트 (브라우저, 앱 등) | External |
| **Controller** | REST API 엔드포인트 (UserController) | Presentation |
| **AuthGuard** | 인증 가드 (FakeAuthGuard) | Presentation (Auth) |
| **UseCase** | 비즈니스 로직 (GetUserProfileUseCase) | Application |
| **Repository** | 저장소 인터페이스 (UserRepository) | Domain |
| **InMemoryRepo** | In-Memory 저장소 구현 | Infrastructure |

### 표기법

```mermaid
sequenceDiagram
    Note over A,B: 정상 흐름
    A->>B: 동기 호출
    A-->>B: 응답
    Note over A,B: 에러 흐름 (빨간색 배경)
```

---

## SD-USER-01: 사용자 정보 조회

### 개요

**Use Case**: [UC-USER-01](use-cases.md#uc-user-01-사용자-정보-조회)

**시나리오**: 인증된 사용자가 자신의 프로필 정보를 조회합니다.

**액터**: 인증된 고객 (Authenticated Customer)

### 정상 흐름

```mermaid
sequenceDiagram
    participant Client
    participant Controller as UserController
    participant AuthGuard as FakeAuthGuard
    participant UseCase as GetUserProfileUseCase
    participant Repository as UserRepository
    participant InMemoryRepo as InMemoryUserRepository

    Note over Client,InMemoryRepo: SD-USER-01: 사용자 정보 조회 (정상 흐름)

    Client->>+Controller: GET /api/users/me<br/>Authorization: Bearer test-master-token-12345

    Note over Controller,AuthGuard: 1. 인증 검증
    Controller->>+AuthGuard: canActivate(context)
    AuthGuard->>AuthGuard: Extract token from header
    AuthGuard->>AuthGuard: Validate token in TOKEN_USER_MAP
    AuthGuard->>AuthGuard: Set req.user = { userId: 'user-uuid-1' }
    AuthGuard-->>-Controller: true

    Note over Controller,UseCase: 2. Use Case 실행
    Controller->>Controller: Extract userId from req.user
    Controller->>+UseCase: execute(GetUserProfileInput)
    Note right of UseCase: input.userId = 'user-uuid-1'

    Note over UseCase,InMemoryRepo: 3. 사용자 조회
    UseCase->>+Repository: findById('user-uuid-1')
    Repository->>+InMemoryRepo: findById('user-uuid-1')
    InMemoryRepo->>InMemoryRepo: Search in userFixtures
    InMemoryRepo->>InMemoryRepo: User.reconstitute(userData)
    InMemoryRepo-->>-Repository: User entity
    Repository-->>-UseCase: User entity

    Note over UseCase: 4. DTO 변환
    UseCase->>UseCase: GetUserProfileOutput.from(user)
    UseCase-->>-Controller: GetUserProfileOutput

    Note over Controller: 5. Response DTO 변환
    Controller->>Controller: UserResponseDto.from(output)
    Controller-->>-Client: 200 OK<br/>{ id, name, email, createdAt }
```

### 컴포넌트 설명

#### 1. 인증 검증 (FakeAuthGuard)

**입력**:
- `context.switchToHttp().getRequest()`
- Authorization 헤더: `Bearer test-master-token-12345`

**처리**:
1. Authorization 헤더에서 토큰 추출 (`substring(7)`)
2. TOKEN_USER_MAP에서 토큰 검증
3. 유효한 경우 `request.user = { userId: 'user-uuid-1' }` 설정

**출력**:
- `true` (인증 성공)
- 예외 발생 (인증 실패)

#### 2. Use Case 실행 (GetUserProfileUseCase)

**입력**:
```typescript
GetUserProfileInput {
  userId: 'user-uuid-1'
}
```

**처리**:
1. UserRepository를 통해 사용자 조회
2. 사용자가 없으면 UserNotFoundException 발생
3. GetUserProfileOutput으로 변환

**출력**:
```typescript
GetUserProfileOutput {
  id: 'user-uuid-1',
  name: '홍길동',
  email: 'hong@example.com',
  createdAt: Date
}
```

#### 3. 사용자 조회 (InMemoryUserRepository)

**입력**:
- `userId: 'user-uuid-1'`

**처리**:
1. userFixtures 배열에서 userId로 검색
2. 찾은 데이터로 User.reconstitute() 호출
3. User 엔티티 반환

**출력**:
- User 엔티티 또는 null

#### 4. DTO 변환

**GetUserProfileOutput → UserResponseDto**:
```typescript
{
  id: 'user-uuid-1',
  name: '홍길동',
  email: 'hong@example.com',
  createdAt: '2025-01-15T10:00:00Z'  // ISO 8601 형식
}
```

### 에러 흐름 1: 유효하지 않은 토큰

```mermaid
sequenceDiagram
    participant Client
    participant Controller as UserController
    participant AuthGuard as FakeAuthGuard

    Note over Client,AuthGuard: SD-USER-01-E1: 유효하지 않은 토큰

    Client->>+Controller: GET /api/users/me<br/>Authorization: Bearer invalid-token

    Controller->>+AuthGuard: canActivate(context)
    AuthGuard->>AuthGuard: Extract token from header
    AuthGuard->>AuthGuard: Validate token in TOKEN_USER_MAP

    rect rgb(255, 200, 200)
        Note over AuthGuard: Token not found in map
        AuthGuard->>AuthGuard: throw UnauthorizedException
        AuthGuard-->>-Controller: UnauthorizedException
        Controller-->>-Client: 401 Unauthorized<br/>{ statusCode: 401, message: "유효하지 않은 토큰입니다" }
    end
```

**에러 메시지**:
```json
{
  "statusCode": 401,
  "message": "유효하지 않은 토큰입니다"
}
```

### 에러 흐름 2: 토큰 없음

```mermaid
sequenceDiagram
    participant Client
    participant Controller as UserController
    participant AuthGuard as FakeAuthGuard

    Note over Client,AuthGuard: SD-USER-01-E2: 토큰 없음

    Client->>+Controller: GET /api/users/me<br/>(No Authorization header)

    Controller->>+AuthGuard: canActivate(context)
    AuthGuard->>AuthGuard: Check Authorization header

    rect rgb(255, 200, 200)
        Note over AuthGuard: No Authorization header
        AuthGuard->>AuthGuard: throw UnauthorizedException
        AuthGuard-->>-Controller: UnauthorizedException
        Controller-->>-Client: 401 Unauthorized<br/>{ statusCode: 401, message: "토큰이 필요합니다" }
    end
```

**에러 메시지**:
```json
{
  "statusCode": 401,
  "message": "토큰이 필요합니다"
}
```

### 에러 흐름 3: 사용자 미존재

```mermaid
sequenceDiagram
    participant Client
    participant Controller as UserController
    participant AuthGuard as FakeAuthGuard
    participant UseCase as GetUserProfileUseCase
    participant Repository as UserRepository
    participant InMemoryRepo as InMemoryUserRepository

    Note over Client,InMemoryRepo: SD-USER-01-E3: 사용자 미존재

    Client->>+Controller: GET /api/users/me<br/>Authorization: Bearer valid-token-deleted-user

    Controller->>+AuthGuard: canActivate(context)
    AuthGuard->>AuthGuard: Validate token (valid)
    AuthGuard->>AuthGuard: Set req.user = { userId: 'user-uuid-999' }
    AuthGuard-->>-Controller: true

    Controller->>+UseCase: execute(GetUserProfileInput)
    Note right of UseCase: input.userId = 'user-uuid-999'

    UseCase->>+Repository: findById('user-uuid-999')
    Repository->>+InMemoryRepo: findById('user-uuid-999')
    InMemoryRepo->>InMemoryRepo: Search in userFixtures

    rect rgb(255, 200, 200)
        Note over InMemoryRepo: User not found
        InMemoryRepo-->>-Repository: null
        Repository-->>-UseCase: null

        Note over UseCase: User is null
        UseCase->>UseCase: throw UserNotFoundException
        UseCase-->>-Controller: UserNotFoundException
        Controller-->>-Client: 404 Not Found<br/>{ statusCode: 404, message: "사용자를 찾을 수 없습니다" }
    end
```

**에러 메시지**:
```json
{
  "statusCode": 404,
  "message": "사용자를 찾을 수 없습니다: user-uuid-999"
}
```

---

## 테스트 시나리오

### 시나리오 1: 정상 조회 (200 OK)

**Given**:
- Master Token: `test-master-token-12345` → userId: `user-uuid-1`
- DB에 홍길동 사용자 정보 존재

**When**:
```http
GET /api/users/me HTTP/1.1
Authorization: Bearer test-master-token-12345
```

**Then**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "user-uuid-1",
  "name": "홍길동",
  "email": "hong@example.com",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**검증 포인트**:
- FakeAuthGuard가 토큰을 검증함
- UserRepository.findById()가 호출됨
- User 엔티티가 DTO로 변환됨
- 응답 시간이 100ms 이내임

### 시나리오 2: 유효하지 않은 토큰 (401)

**Given**:
- 잘못된 Master Token: `invalid-token-xyz`

**When**:
```http
GET /api/users/me HTTP/1.1
Authorization: Bearer invalid-token-xyz
```

**Then**:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "statusCode": 401,
  "message": "유효하지 않은 토큰입니다"
}
```

**검증 포인트**:
- FakeAuthGuard에서 즉시 예외 발생
- Use Case가 실행되지 않음
- Repository가 호출되지 않음

### 시나리오 3: 토큰 없음 (401)

**Given**:
- Authorization 헤더 없음

**When**:
```http
GET /api/users/me HTTP/1.1
```

**Then**:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "statusCode": 401,
  "message": "토큰이 필요합니다"
}
```

**검증 포인트**:
- FakeAuthGuard에서 헤더 누락 감지
- 적절한 에러 메시지 반환

### 시나리오 4: 사용자 미존재 (404)

**Given**:
- 유효한 토큰이지만 사용자가 삭제됨
- Token: `test-token-deleted` → userId: `user-uuid-999`
- DB에 user-uuid-999 없음

**When**:
```http
GET /api/users/me HTTP/1.1
Authorization: Bearer test-token-deleted
```

**Then**:
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "statusCode": 404,
  "message": "사용자를 찾을 수 없습니다: user-uuid-999"
}
```

**검증 포인트**:
- FakeAuthGuard는 통과함 (토큰 유효)
- Repository.findById()가 null 반환
- Use Case에서 UserNotFoundException 발생

---

## 성능 고려사항

### 응답 시간 목표

| 시나리오 | 목표 | 측정 |
|---------|------|------|
| 정상 조회 | < 100ms | p95 |
| 인증 실패 | < 10ms | p95 |
| 사용자 미존재 | < 50ms | p95 |

### 최적화 전략

1. **인증 검증 최적화**:
   - TOKEN_USER_MAP은 메모리 Map 사용 (O(1) 조회)
   - 향후 JWT 전환 시 Redis 캐싱 고려

2. **Repository 최적화**:
   - InMemoryRepository는 Map으로 구현 (O(1) 조회)
   - 실제 DB 연결 시 인덱스 활용 (PRIMARY KEY on id)

3. **DTO 변환 최적화**:
   - 불필요한 필드 제외
   - 단순 객체 매핑 (복잡한 변환 로직 없음)

---

## 보안 고려사항

### 인증 검증

1. **Master Token 방식 (현재)**:
   - 장점: 구현 간단, 테스트 용이
   - 단점: 보안 취약, 프로덕션 부적합
   - 용도: 개발 및 테스트 전용

2. **JWT 방식 (향후)**:
   - 장점: 표준 인증, 보안 강화
   - 구현: `@nestjs/jwt`, `@nestjs/passport` 사용
   - 검증: 서명 검증, 만료 시간 확인

### 본인 확인

- GET /api/users/me는 항상 본인 정보만 조회
- 토큰에서 추출된 userId로만 조회
- 다른 사용자 정보 조회 불가 (권한 분리)

---

## 향후 전환 계획

### JWT 인증 전환 시 변경사항

#### 1. FakeAuthGuard → JwtAuthGuard

**Before**:
```typescript
@UseGuards(FakeAuthGuard)
async getMyProfile(@Request() req) {
  const userId = req.user.userId;  // TOKEN_USER_MAP에서 추출
  // ...
}
```

**After**:
```typescript
@UseGuards(JwtAuthGuard)
async getMyProfile(@Request() req) {
  const userId = req.user.userId;  // JWT payload에서 추출
  // ...
}
```

#### 2. 시퀀스 다이어그램 변경

**변경 전 (FakeAuthGuard)**:
```
AuthGuard->>AuthGuard: Validate token in TOKEN_USER_MAP
```

**변경 후 (JwtAuthGuard)**:
```
AuthGuard->>AuthGuard: Verify JWT signature
AuthGuard->>AuthGuard: Check expiration
AuthGuard->>AuthGuard: Extract userId from payload
```

#### 3. 영향 받지 않는 부분

- UserController의 비즈니스 로직
- GetUserProfileUseCase
- UserRepository
- User Entity
- 모든 DTO 클래스

**결론**: Guard만 교체하면 되므로 도메인 로직은 변경 불필요

---

## 관련 문서

- **Use Cases**: [Use Cases](use-cases.md)
- **API Specification**: [API 명세서](../api-specification.md#61-get-usersme)
- **Data Model**: [데이터 모델](../data-model.md#1-user-사용자)
- **Requirements**: [요구사항 분석](../requirements.md)
- **User Stories**: [사용자 스토리](../user-stories.md#us-user-01-사용자-정보-조회)
- **Issue**: [Issue #013](../../issue/issue013.md)

---

**버전 이력**:
- 1.0.0 (2025-11-20): 초기 문서 작성
  - SD-USER-01: 사용자 정보 조회 시퀀스 다이어그램
  - 정상 흐름 및 3가지 에러 흐름 정의
  - 테스트 시나리오 및 성능 고려사항 추가
  - JWT 전환 계획 명세
