# STEP12 캐시 전략 적용 보고서

## 1. 개요

### 1.1 배경

이커머스 서비스에서 상품 조회는 가장 빈번하게 발생하는 API 요청입니다. 트래픽이 증가하면 DB 부하가 커지고 응답 지연이 발생할 수 있습니다. 이를 해결하기 위해 Redis 기반 캐싱 전략을 적용하고자 하였습니다. 하지만, 기존 과제들을 제대로 제출하지 못해서 admin 기능들(상품 관리 등)을 구현하지 못해 사용자 대시보드 쪽에서의 캐시 부분만 생각하였습니다. 추후 과제에서 기능을 점점 확장하려고 합니다.

### 1.2 목표

- 조회 API 응답 시간 개선
- DB 부하 감소
- Cache Aside 패턴 적용

---

## 2. 캐시 적용 대상 분석

### 2.1 캐시 적용 기준

| 기준 | 설명 |
|------|------|
| 조회 빈도 | 높은 빈도로 호출되는 API |
| 데이터 변경 빈도 | 자주 변경되지 않는 데이터 |
| 응답 시간 | DB 조회 비용이 높은 쿼리 |

### 2.2 캐시 적용 대상

**적용된 API**

| API | 캐시 키 패턴 | TTL | 적용 이유 |
|-----|-------------|-----|-----------|
| 상품 목록 조회 | `products:list:{page}:{limit}` | 30초 | 높은 조회 빈도, 페이지네이션 캐싱 |
| 상품 상세 조회 | `products:detail:{productId}` | 60초 | 상품 정보는 자주 변경되지 않음 |

**미적용 API (향후 고려)**

| API | 미적용 이유 |
|-----|-------------|
| 장바구니 조회 | 사용자별 데이터, 실시간 재고 반영 필요 |
| 주문 내역 | 사용자별 데이터, 결제 완료 즉시 반영 필요 |
| 잔액 조회 | 실시간 정확성 필요 |

---

## 3. 캐시 아키텍처

### 3.1 Cache Aside 패턴 적용

```text
Client --> Use Case (Cacheable) --> Redis (Cache)
                |
                | Cache Miss
                v
           Database (Prisma)
```

### 3.2 캐시 전략 흐름

1. **Cache Hit**: Redis에서 데이터 반환, DB 접근 없음
2. **Cache Miss**: DB 조회 후 결과를 Redis에 저장하고 응답

### 3.3 구현 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `CacheService` | Redis 캐시 CRUD 및 패턴 삭제 |
| `@Cacheable` | AOP 방식 캐시 데코레이터 |
| `@CacheEvict` | 캐시 무효화 데코레이터 |

---

## 4. 캐시 구현 상세

### 4.1 @Cacheable 데코레이터

```typescript
@Cacheable('products:list:{input.page}:{input.limit}', { ttlMs: 30000 })
async execute(input: GetProductsInput): Promise<GetProductsOutput> {
  // DB 조회 로직
}
```

**특징:**

- 메서드 파라미터에서 동적 캐시 키 생성
- TTL 옵션으로 만료 시간 설정
- 캐시 서비스를 생성자 주입으로 받아 AOP 적용

### 4.2 패턴 기반 캐시 무효화

```typescript
// SCAN 명령어로 성능 최적화 (KEYS 대신)
async delByPattern(pattern: string): Promise<void> {
  const keys = await this.scanKeys(`cache:${pattern}*`);
  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}
```

---

## 5. TTL 전략

### 5.1 TTL 설정 기준

| 데이터 유형 | TTL | 근거 |
|-------------|-----|------|
| 상품 목록 | 30초 | 재고 변동 반영 주기 고려 |
| 상품 상세 | 60초 | 상품 정보 변경 빈도 낮음 |

### 5.2 Expiration vs Eviction

| 전략 | 적용 방식 |
|------|-----------|
| Expiration | TTL 설정으로 자동 만료 |
| Eviction | 상품 정보 변경 시 `@CacheEvict`로 수동 무효화 |

---

## 6. Cache Stampede 대응 전략

### 6.1 문제 정의

다수의 요청이 한 캐시에 요청을 했으나, 이 TTL 만료 시 다수의 요청이 동시에 DB를 조회하는 현상

### 6.2 구현 조사

| 전략 | 설명 |
|------|------|
| Lock-based refresh | 캐시 갱신 시 분산락 획득 |
| Probabilistic early expiration | TTL 만료 전 확률적 갱신 |
| Background refresh | 백그라운드에서 주기적 갱신 |

### 6.3 TTL 확률적 갱신 알고리즘 종류

1. 랜덤 방식

TTL 의 특정 범위 내에서 확률적으로 TTL 을 갱신하도록 함

2. PER(Probabilistic Early Refresh) 알고리즘

만료 시간이 가까워 질수록 점진적으로 갱신 확률을 높이는 방법

---

## 7: 캐시 키 설계 계획

```text
# 상품 관련
products:list:{page}:{limit}     # 상품 목록
products:detail:{productId}       # 상품 상세
products:popular                  # 인기 상품 (향후)

# 무효화 패턴
products:list:*                   # 모든 상품 목록 캐시 삭제
products:detail:{productId}       # 특정 상품 캐시 삭제
```
