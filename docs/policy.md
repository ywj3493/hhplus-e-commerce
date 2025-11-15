# Project Policy

## Development Workflow

### Issue-Driven Development
All development tasks must start with an issue document.

#### Issue Creation
1. Create a new issue file in `/docs/issue/`
2. Follow naming convention: `issue{NNN}.md` (e.g., `issue001.md`, `issue002.md`)
3. Use 3-digit zero-padding for issue numbers
4. Document the problem, requirements, and acceptance criteria

#### Branch Management
1. Create a new branch from `main` for each issue
2. Branch naming format: `{type}/{issue-number}`
   - `feature/{NNN}` - New features
   - `bugfix/{NNN}` - Bug fixes
   - `docs/{NNN}` - Documentation updates
   - Examples: `feature/001`, `bugfix/002`, `docs/003`

#### Commit Guidelines
- Reference issue number in commit messages
- Use clear, descriptive commit messages
- Make atomic commits (one logical change per commit)

#### Pull Request Process
1. Create PR from feature branch to `main`
2. Reference the issue number in PR description
3. Ensure all documentation is updated
4. Code review required before merge

## Documentation Standards

### Language Usage
- **Korean**: Development specs and internal communication
  - `/docs/dev/*` - Requirements, use cases, API specs
  - `/docs/reference/*` - Assignments and reference materials
- **English**: Project-level documentation and AI collaboration
  - Root-level markdown files
  - Technical architecture documents
  - `/docs/issue/*` - Issue tracking documents (for Claude collaboration)

### Documentation Sequence
Documents must be created and maintained in this order:

1. **Requirements Analysis** (`/docs/dev/requirements.md`)
   - Business requirements
   - Technical constraints
   - Functional specifications

2. **Use Cases** (`/docs/dev/user-stories.md`)
   - User stories
   - Actor definitions
   - Scenario descriptions

3. **API Specifications** (`/docs/dev/api-spec.md`)
   - Endpoint definitions
   - Request/Response schemas
   - Error codes

4. **Sequence Diagrams** (`/docs/dev/sequence-diagrams.md`)
   - Process flows
   - System interactions
   - Edge cases

### Documentation Updates
- Update documentation BEFORE implementation
- Keep docs in sync with code changes
- Review documentation during PR process

## File Organization

### Directory Structure
```
/
   CLAUDE.md                 # Project context for Claude
   docs/
      policy.md            # This file
      dev/                 # Development documentation (Korean)
         requirements.md
         user-stories.md
         api-spec.md
         sequence-diagrams.md
      issue/               # Issue tracking (English)
         issue001.md
         issue002.md
         ...
      reference/           # Reference materials (Korean)
          assignment/
   src/                     # Source code (TBD)
```

## Technology Stack

### Current Stack
- **Framework**: NestJS
- **ORM**: Prisma
- **Language**: TypeScript
- **Package Manager**: pnpm (REQUIRED)

### Architecture
- Architecture pattern: TBD (To Be Decided)
- Will be documented as decisions are made

## Package Management

### pnpm Usage (REQUIRED)
This project **exclusively uses pnpm** as the package manager.

**Common Commands:**
```bash
pnpm install          # Install dependencies
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm run start:dev    # Start development server
pnpm run build        # Build the project
pnpm run lint         # Run linter
```

**DO NOT use npm or yarn** - all team members must use pnpm to ensure consistency in lock files and dependency resolution.

## Testing Standards

### Test File Structure
- Test files must be colocated with source files: `*.spec.ts`
- Integration tests: `/test/{module}/integration/*.integration.spec.ts`
- E2E tests: `/test/{module}/e2e/*.e2e.spec.ts`

### Test Language Conventions
All test files must follow Korean language conventions:

**describe blocks**: Use Korean to describe the test subject
```typescript
describe('생성', () => {})           // For creation tests
describe('실행', () => {})           // For execution tests
describe('입력 검증', () => {})      // For input validation tests
describe('재고 상태 조회', () => {}) // For specific domain operations
```

**it blocks**: Use Korean action-oriented sentences ending in "해야 함"
```typescript
it('유효한 파라미터로 인스턴스를 생성해야 함', () => {})
it('재고가 있을 때 true를 반환해야 함', () => {})
it('음수 금액에 대해 에러를 발생시켜야 함', () => {})
```

**Comments**:
- Given-When-Then keywords: Keep in English (`// Given`, `// When`, `// Then`, `// When & Then`)
- Inline comments: Use Korean (e.g., `// 품절`, `// 재고 있음`, `// 초기 재고`)
- Business requirement references: Keep as-is (e.g., `BR-PROD-01`)

**Code elements**: Keep in English
- Variable names, function names, class names
- Error messages are in Korean (already implemented)

### Test Coverage
- Unit tests for all business logic
- Integration tests for layer interactions
- E2E tests for API endpoints
- Maintain >80% code coverage

## Version Control

### Git Workflow
1. `main` branch is protected
2. All changes via feature branches
3. No direct commits to `main`
4. Squash merges preferred for clean history

### Commit Message Format
```
[#issue-number] Brief description

Detailed explanation if needed
```

Example:
```
[#001] Add user authentication endpoints

Implement login and registration API endpoints
```

## Code Review

### Review Checklist
- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or documented)
- [ ] Issue requirements are met

## Notes
- This policy document will evolve as the project grows
- All team members should review and follow these guidelines
- Exceptions require documentation and approval
