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

## Notes
- All commits should reference the related issue number
- Documentation should be updated before implementation
- Architecture decisions will be documented as the project evolves
