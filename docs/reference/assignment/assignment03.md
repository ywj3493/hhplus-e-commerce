**⚠️ 이번 과제는 DB를 사용하지 않습니다.** 

**모든 데이터는 인메모리(Map, Array 등)로 관리하세요.**

### **`STEP 5 - 레이어드 아키텍처 기본 구현`**

- Week 2의 ERD를 기반으로 도메인 모델 구현 (Entity, Value Object)
- Week 2의 API 명세를 유스케이스로 구현
- 레이어드 아키텍처 구조로 구현 (Presentation, Application, Domain, Infrastructure 4계층 분리)
- 재고 관리 로직 구현 (재고 조회, 차감, 복구)
- 주문/결제 프로세스 구현 (주문 생성, 상태 관리, 결제 처리)
    - 선착순 쿠폰 로직 구현 (쿠폰 발급, 사용, 만료 처리)
- 각 계층별 단위 테스트 작성 (커버리지 70% 이상)

### **`STEP 6 - 동시성 제어 및 고급 기능`**

- 선착순 쿠폰 발급에 대한 동시성 제어 구현 (Race Condition 방지)
- 동시 요청 시나리오에 대한 통합 테스트 작성
- 인기 상품 집계 로직 구현 (조회수/판매량 기반 순위 계산)
- 동시성 제어 방식 분석 보고서 작성 ([README.md](http://readme.md/))
    - 선택한 동시성 제어 방식 설명
    - 장단점 분석
    - 대안 방식 비교

<aside>
🚥 **과제 평가 기준과 핵심 역량 Summary**

</aside>

### P/F 기준

<aside>
🚩 **과제 : 이번 챕터 과제 평가 기준에 따라 step의 pass/fail을 정합니다.**

</aside>

### 과제 평가 기준

[ Step 5 ]
< 레이어드 아키텍처 기본 구현 >

Pass 조건 (모두 충족 필요)
  • 4계층(Presentation, Application, Domain, Infrastructure)이 명확히 분리되어 있는가?
  • 도메인 모델이 비즈니스 규칙을 포함하고 있는가?
  • Repository 패턴이 적용되어 인터페이스와 구현체가 분리되어 있는가?
  • 핵심 비즈니스 로직(재고/주문/쿠폰)이 정상 동작하는가?
  • 단위 테스트 커버리지가 70% 이상인가?
  • DB 없이 인메모리로 구현되었는가?

Fail 사유
  • 계층 분리 없이 단일 파일에 모든 로직이 작성된 경우
  • 비즈니스 로직이 Controller나 Repository에 위치한 경우
  • 테스트가 없거나 커버리지가 50% 미만인 경우
  • DB를 사용한 경우
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ Step 6 ]
< 동시성 제어 및 고급 기능 >

Pass 조건 (모두 충족 필요)
  • 선착순 쿠폰 발급 시 Race Condition이 발생하지 않는가?
  • 동시성 테스트가 작성되어 있고 통과하는가?
  • 인기 상품 집계 로직이 효율적으로 구현되었는가?
  • README.md에 동시성 제어 방식에 대한 기술 분석이 포함되어 있는가?

Fail 사유
  • 동시성 제어 없이 Race Condition이 발생하는 경우
  • 동시성 검증 테스트가 없는 경우
  • README.md에 동시성 제어 분석이 없는 경우

### 도전 항목

## 레이어드 아키텍처 및 이커머스 심화 과제 평가 항목

- 계층 분리가 명확하고 의존성 방향이 올바른가?
- 동시성 제어 방식을 2가지 이상 비교 분석했는가?
- 테스트 커버리지가 80% 이상인가?
- README에 설계 결정 이유가 작성되어 있는가?

### 핵심 키워드 및 역량

### 🏗️ 레이어드 아키텍처 기본 (STEP 5)

**🎯 과제 목표**
• 레이어드 아키텍처 패턴을 이해하고 실제 프로젝트에 적용하기
• 계층별 책임과 의존성 방향 이해
• 이커머스 핵심 비즈니스 로직 구현 능력 향상
• 도메인 중심 설계 능력 함양

**🛠️ 핵심 기술 키워드**
• Layered Architecture (레이어드 아키텍처)
• Domain Model (도메인 모델)
• Use Case (유스케이스)
• Repository Pattern (레포지토리 패턴)
• Unit Test (단위 테스트)
• Test Coverage (테스트 커버리지)

**🧠 핵심 역량**

계층 분리 설계 : Presentation, Application, Domain, Infrastructure 계층의 명확한 분리

도메인 모델링 : ERD를 기반으로 한 객체지향 도메인 모델 설계

유스케이스 설계 : API 명세를 비즈니스 유스케이스로 변환하는 능력

재고/주문 관리 : 이커머스 핵심 로직 구현 (재고 차감, 주문 생성, 결제 처리)

단위 테스트 작성 : 각 계층별 테스트 작성 및 커버리지 관리

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 💎 동시성 제어 및 고급 기능 (STEP 6)

**🎯 과제 목표**
• 동시성 문제 이해 및 해결 능력 습득
• 선착순 이벤트의 안전한 처리 구현
• 대용량 트래픽 대응 능력 향상
• 성능과 정확성의 트레이드오프 이해

**🛠️ 핵심 기술 키워드**
• Concurrency Control (동시성 제어)
• Race Condition (경쟁 상태)
• Lock Mechanism (락 메커니즘)
• Integration Test (통합 테스트)
• Data Aggregation (데이터 집계)

**🧠 핵심 역량**

동시성 제어 구현 : 선착순 쿠폰 발급의 Race Condition 방지

락 메커니즘 이해 : Mutex, Semaphore, Queue 등의 장단점 이해 및 적용

통합 테스트 설계 : 동시성 시나리오를 검증하는 통합 테스트 작성

데이터 집계 로직 : 인기 상품 순위 계산 및 효율적인 집계 구현

문서화 능력 : 기술적 결정사항과 트레이드오프의 명확한 문서화

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 요약 정리

[ STEP 5: 레이어드 아키텍처 구현 ]
• 핵심 주제: 레이어드 아키텍처 구현
• 과제 예시: 도메인 모델, 재고/주문/쿠폰 로직
• 핵심 기술: Layered Architecture, Domain Model
• 제출 형태: 코드 + 단위 테스트 (커버리지 70%)
• 평가 중점: 계층 분리, 비즈니스 로직 구현

[ STEP 6: 동시성 제어 및 고급 기능 ]
• 핵심 주제: 동시성 제어 및 고급 기능
• 과제 예시: 선착순 쿠폰 동시성, 인기 상품 집계
• 핵심 기술: Concurrency Control, Lock Mechanisms
• 제출 형태: 코드 + 통합 테스트 + README
• 평가 중점: 동시성 안전성, 성능 최적화

## 토론주제

**레이어드 아키텍처 설계**

- "처음부터 4계층 분리" vs "필요할 때 분리" 작은 프로젝트에도 레이어드 아키텍처가 필요한가?
- Controller에서 바로 Repository를 호출하면 안 되나? Application Layer의 존재 이유는?
- 도메인 모델 vs 데이터 모델 Entity를 그대로 API 응답으로 내려도 되는가?
- 계층 간 데이터 전달 DTO는 각 계층마다 따로 만들어야 하나?

**비즈니스 로직의 위치**

- 주문 로직은 OrderService에 둘까, Order Entity에 둘까? 비즈니스 로직은 어디에 두어야 하는가?
- 재고 차감을 Service에서 처리할까, Product Entity에서 처리할까? 도메인 로직의 책임 소재
- Value Object가 정말 필요한가? 원시 타입으로 충분하지 않을까?
- Domain Service vs Application Service 둘의 차이는 무엇이고 언제 사용해야 하나?

**의존성 방향과 구조**

- Domain 계층이 Infrastructure를 몰라야 한다는데, Repository 인터페이스는 어디에 두어야 하나?
- **UseCase가 여러 Repository를 의존해도 되나? 계층 간 의존성의 적절한 범위**
- **Domain Entity와 Persistence Entity를 나눌 것인가? 합칠 것인가?**
- Presentation → Application → Domain ← Infrastructure 방향이 왜 중요한가?

**동시성 제어와 트랜잭션**

- 선착순 쿠폰 발급, 어느 계층에서 동시성을 제어해야 하나? Domain? Application? Infrastructure?
- 인메모리 환경에서 트랜잭션을 어떻게 구현할 수 있을까? 롤백 메커니즘 설계
- 주문 생성 시 재고 차감과 결제 처리, 하나라도 실패하면? 트랜잭션 경계 설정

<aside>
💬

FAQ & 참고자료

</aside>

<aside>

Q1: 작은 프로젝트에도 이런 복잡한 아키텍처가 필요한가요?

A: 프로젝트 규모와 복잡도에 따라 적절한 아키텍처를 선택해야 합니다!

작은 프로젝트에서는 레이어드 아키텍처로 충분합니다. 간단한 CRUD 작업이 주를 이루고, 빠른 개발이 목표라면 복잡한 아키텍처는 오히려 생산성을 떨어뜨립니다.

프로젝트가 성장하면서 다음과 같은 신호가 보일 때 아키텍처 전환을 고려하세요:

- 테스트 작성이 어려워질 때 → 헥사고날 고려
- 비즈니스 로직이 복잡해질 때 → 클린 아키텍처 고려
- 도메인 전문가와 긴밀한 협업이 필요할 때 → DDD 고려
</aside>

<aside>

Q2: TDD(테스트 주도 개발)가 정말 효과적인가요? 개발 속도가 느려지지 않나요?

A: TDD는 단기적으로는 느릴 수 있지만, 장기적으로는 훨씬 빠르고 안정적입니다!

**TDD의 실제 효과 (연구 결과 기반)**

- **버그 감소**: 40-90% 적은 버그
- **코드 품질**: 더 나은 설계와 낮은 결합도
- **유지보수**: 수정 시 안정성 향상
- **문서화**: 테스트가 살아있는 명세서 역할

**장기적으로 더 빠른 이유**

- 디버깅 시간 단축: 버그 위치를 빠르게 특정
- 리팩토링 안정성: 기존 기능 보장하며 개선
- 회귀 버그 방지: 새 기능 추가 시 기존 기능 보호
- 설계 개선: 테스트하기 쉬운 코드는 좋은 설계
</aside>

<aside>

Q3: 의존성 주입이 코드를 더 복잡하게 만드는 것 같은데, 정말 필요한가요?

A: 의존성 주입은 초기에는 복잡해 보이지만, 테스트와 유지보수에서 엄청난 이점을 제공합니다!

**의존성 주입의 진짜 가치**

**테스트 용이성**

- 외부 시스템 없이도 비즈니스 로직 테스트
- 테스트 속도 100배 향상 (DB 호출 → 메모리 호출)
- 안정적이고 반복 가능한 테스트

**유연성 극대화**

- 개발/테스트/운영 환경별 다른 구현체 사용
- 요구사항 변경에 강함
- 기술 스택 변경 시 영향 최소화

**병렬 개발 가능**

- 팀별로 인터페이스와 구현체를 분리하여 개발
- Mock을 이용한 독립적인 개발과 테스트
</aside>

<aside>

Q4: 각 아키텍처 패턴의 핵심 차이점은 무엇인가요?

A: 각 아키텍처는 해결하려는 문제와 중점을 두는 부분이 다릅니다!

**레이어드 아키텍처**

- **핵심**: 수평적 계층 분리
- **장점**: 직관적이고 이해하기 쉬움
- **단점**: 데이터베이스 중심 설계
- **적합한 경우**: 전통적인 웹 애플리케이션

**헥사고날 아키텍처**

- **핵심**: 포트와 어댑터로 외부 시스템 격리
- **장점**: 테스트 용이, 기술 독립성
- **단점**: 초기 설정 복잡
- **적합한 경우**: 외부 연동이 많은 시스템

**클린 아키텍처**

- **핵심**: 의존성 역전으로 비즈니스 로직 보호
- **장점**: 프레임워크 독립성, 비즈니스 중심
- **단점**: 코드량 증가, 학습 곡선
- **적합한 경우**: 장기 운영 엔터프라이즈 시스템

**DDD**

- **핵심**: 도메인 모델과 유비쿼터스 언어
- **장점**: 비즈니스와 코드 일치, 복잡한 도메인 표현
- **단점**: 높은 학습 비용, 과도한 복잡성 위험
- **적합한 경우**: 복잡한 비즈니스 도메인
</aside>

**필수 참고자료**

1. **Clean Architecture - Robert C. Martin**
    - URL: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
    - 설명: 클린 아키텍처의 원저자가 직접 설명하는 핵심 개념
2. **Hexagonal Architecture - Alistair Cockburn**
    - URL: https://alistair.cockburn.us/hexagonal-architecture/
    - 설명: 헥사고날 아키텍처의 창시자가 작성한 원본 아티클
3. **Domain-Driven Design - Eric Evans**
    - URL: https://www.domainlanguage.com/ddd/
    - 설명: DDD의 창시자 Eric Evans의 공식 사이트
4. **Martin Fowler's Blog**
    - URL: https://martinfowler.com/
    - 설명: 소프트웨어 아키텍처에 대한 깊이 있는 아티클 모음

**추천 학습 자료**

초급자용

- **Patterns of Enterprise Application Architecture**: Martin Fowler의 엔터프라이즈 패턴 기초
- **Clean Code**: Robert C. Martin의 깨끗한 코드 작성법
- **Head First Design Patterns**: 디자인 패턴 입문서

중급자용

- **Implementing Domain-Driven Design**: Vaughn Vernon의 DDD 실전 가이드
- **Building Microservices**: Sam Newman의 마이크로서비스 구축
- **Refactoring**: Martin Fowler의 리팩토링 기법

고급자용

- **Domain-Driven Design Distilled**: DDD 핵심 요약
- **Software Architecture: The Hard Parts**: 현대적 아키텍처 트레이드오프
- **Fundamentals of Software Architecture**: 아키텍처 기초 완전 정복

**유용한 도구**

1. **Jest**: JavaScript 테스트 프레임워크
    - https://jestjs.io/
2. **Testcontainers**: 통합 테스트용 컨테이너
    - https://www.testcontainers.org/
3. **SonarQube**: 코드 품질 분석
    - https://www.sonarqube.org/
4. **Architecture Decision Records (ADR)**: 아키텍처 의사결정 문서화
    - https://adr.github.io/
5. **PlantUML**: 아키텍처 다이어그램 작성
    - https://plantuml.com/

**커뮤니티 및 질문**

- **Stack Overflow**: `software-architecture`, `clean-architecture`, `ddd`, `hexagonal-architecture` 태그
- **Reddit**: r/softwarearchitecture
- **DDD Community**: https://github.com/ddd-community