# E-Commerce Backend Service

## Project Overview
Backend service for an e-commerce platform built with NestJS and Prisma ORM.

## Tech Stack
- **Framework**: NestJS
- **ORM**: Prisma
- **Architecture**: TBD (To Be Decided)

## Documentation Structure

### Language Policy
- **Korean**: Used for internal communication and development documentation
  - `/docs/dev/*` - Development specifications and requirements
  - `/docs/reference/*` - Reference materials and assignments
- **English**: Used for project-wide documentation and Claude interactions
  - Root-level docs (this file, policy.md)
  - Technical specs and architectural docs
  - `/docs/issue/*` - Issue tracking documents (for Claude collaboration)

### Directory Structure
```
/docs
  /dev              # Development specs (Korean)
    requirements.md # Requirements analysis
    user-stories.md    # Use case specifications
    api-spec.md     # API specifications
    sequence-diagrams.md # Sequence diagrams
  /issue            # Issue tracking (English)
    issue001.md
    issue002.md
  /reference        # Reference materials (Korean)
    /assignment     # Course assignments
  policy.md         # Project policies (English)
```

## Development Workflow

### Issue-Based Development
1. Create issue document in `/docs/issue/issue0XX.md`
2. Create feature branch from issue
3. Implement with multiple commits
4. Create pull request referencing issue

### Issue Numbering
- Format: `issue001`, `issue002`, `issue003`, etc.
- Sequential numbering with zero-padding (3 digits)

### Branch Naming
- Format: `{prefix}/{issue-number}`
- Examples:
  - `feature/001`
  - `bugfix/002`
  - `docs/003`

## Documentation Sequence
1. **Requirements Analysis** → Define business and technical requirements
2. **Use Cases** → Identify actors and scenarios
3. **API Specifications** → Design RESTful endpoints
4. **Sequence Diagrams** → Visualize workflows
5. **Implementation** → Code based on specs

## Package Manager
- **Always use `pnpm`** for all package management operations
  - Install dependencies: `pnpm install`
  - Run tests: `pnpm test`
  - Run dev server: `pnpm run start:dev`
  - Build: `pnpm run build`
- **DO NOT use `npm` or `yarn`** - this project exclusively uses pnpm

## Code Organization

### DTO Structure
Application Layer의 DTO는 Use Case별로 하나의 파일에 통합합니다:

**파일 명명 규칙:**
- `{use-case-name}.dto.ts` (예: `get-product-detail.dto.ts`, `get-products.dto.ts`)

**파일 구성:**
```typescript
// {use-case-name}.dto.ts

// 1. 관련 보조 클래스/VO (필요한 경우)
export class SomeDetailClass { ... }

// 2. Input DTO
export class {UseCaseName}Input {
  constructor() { ... }
  private validate(): void { ... }
}

// 3. Output DTO
export class {UseCaseName}Output {
  constructor() { ... }
}
```

**장점:**
- Use Case 관련 모든 DTO를 한 파일에서 확인 가능
- Input과 Output 간의 연관성 명확화
- 파일 수 감소로 코드 탐색 용이성 향상

**예시:**
- ✅ `src/product/application/dtos/get-product-detail.dto.ts` (Input + Output 통합)
- ❌ `src/product/application/dtos/get-product-detail.input.ts` (개별 파일)
- ❌ `src/product/application/dtos/get-product-detail.output.ts` (개별 파일)

## Testing Conventions
- **Test Language**: Korean for `describe` and `it` blocks
  - `describe` blocks: Use Korean to describe the test subject (e.g., "생성", "실행", "입력 검증")
  - `it` blocks: Use Korean with action-oriented sentences ending in "해야 함" (e.g., "유효한 파라미터로 인스턴스를 생성해야 함")
- **Comments**: Given-When-Then format stays in English, other comments should be in Korean
  - Keep: `// Given`, `// When`, `// Then`, `// When & Then`
  - Inline comments in Korean (e.g., `// 품절`, `// 재고 있음`, `// 초기 재고`)
- **Business Requirement References**: Keep as-is (e.g., `BR-PROD-01`, `BR-PROD-02`)
- **Code and Variables**: Keep in English (variable names, function names, etc.)
- **Error Messages**: Already in Korean, keep as-is

## Commit Message Conventions
All commit messages must follow Korean conventions (except for the type prefix):

**Format:**
```
<type>: <subject in Korean>

<body in Korean>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types** (keep in English):
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가 또는 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `chore`: 빌드 설정 등 기타 변경사항

**Examples:**
```
test: 테스트 한글화 완료

Domain, Application, Infrastructure 레이어의 모든 테스트 파일을 한글로 변환했습니다.
- describe/it 블록을 한글로 작성
- Given-When-Then 주석은 영문 유지
- 인라인 주석은 한글로 작성

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
feat: 상품 상세 조회 API 구현

상품 상세 정보와 옵션 그룹을 조회하는 API를 구현했습니다.
- BR-PROD-05: 옵션 타입별 그룹화
- BR-PROD-06: 재고 상태 포함
- BR-PROD-08: 품절 옵션 선택 불가 표시

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Notes
- All commits should reference the related issue number
- Documentation should be updated before implementation
- Architecture decisions will be documented as the project evolves
