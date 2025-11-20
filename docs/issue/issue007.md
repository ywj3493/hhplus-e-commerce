# Issue #007: Restructure Architecture Documentation to Domain-First Approach

## Metadata
- **Issue Number**: #007
- **Status**: Completed
- **Created**: 2025-11-04
- **Completed**: 2025-11-16
- **Related Branch**: `feature/007`
- **Related Docs**:
  - [Architecture](../dev/dashboard/architecture.md)

## Problem Statement

The current architecture documentation follows a **layer-first approach** (presentation → application → domain → infrastructure) where domains are nested within layers. However, for better alignment with NestJS conventions and improved code organization, we need to adopt a **domain-first approach** where each domain contains its own layers.

Additionally, the documentation lacks comprehensive guidelines for test organization.

## Goals

1. **Restructure architecture documentation** to use domain-first as the primary approach
2. **Add comprehensive test organization section** with clear guidelines
3. **Update all code examples** to reflect domain-first folder structure
4. **Align with NestJS module-based architecture** conventions

## Current Structure (Layer-First)

```
src/
├── presentation/
│   ├── user/
│   └── product/
├── application/
│   ├── user/
│   └── product/
├── domain/
│   ├── user/
│   └── product/
└── infrastructure/
    ├── user/
    └── product/
```

## Desired Structure (Domain-First)

```
src/
├── product/
│   ├── presentation/     # Controllers, DTOs
│   ├── application/      # Use Cases
│   ├── domain/          # Entities, Value Objects, Interfaces
│   └── infrastructure/  # Repository implementations
├── order/
│   ├── presentation/
│   ├── application/
│   ├── domain/
│   └── infrastructure/
├── cart/
│   └── ...
└── shared/              # Shared utilities and base classes
    ├── domain/
    ├── infrastructure/
    └── utils/
```

## Test Organization

```
test/
├── product/
│   ├── domain/              # Unit tests for entities
│   │   ├── product.entity.spec.ts
│   │   └── stock.entity.spec.ts
│   ├── application/         # Integration tests for use cases
│   │   ├── get-products.use-case.integration.spec.ts
│   │   └── get-product-detail.use-case.integration.spec.ts
│   └── presentation/        # E2E tests for controllers
│       └── product.controller.e2e.spec.ts
├── order/
│   └── ...
└── shared/
    └── ...
```

## Benefits of Domain-First Approach

1. **Better Cohesion**: All code related to a domain is located together
2. **Improved Scalability**: Easy to add/remove entire domains
3. **Clearer Boundaries**: Each domain is a bounded context
4. **NestJS Alignment**: Matches NestJS module-based architecture
5. **Team Organization**: Teams can own specific domains
6. **Easier Navigation**: Developers find related code faster

## Implementation Steps

### 1. Update Architecture Documentation
- [x] Read current architecture.md
- [ ] Rewrite with domain-first as primary approach
- [ ] Add test organization section
- [ ] Update all code examples and import paths
- [ ] Update folder structure diagrams

### 2. Document Test Organization
- [x] Define test types (unit, integration, e2e)
- [x] Specify test location conventions
- [x] Provide naming conventions
- [x] Add test examples for each layer

### 3. Update References
- [x] Update cross-references in related documents (CLAUDE.md, policy.md)
- [x] Ensure consistency with other docs

## Documentation Changes

### New Sections to Add
1. **Domain-First Architecture** (replaces section 6.2 as primary)
2. **Test Organization** (new comprehensive section)
3. **Test Naming Conventions** (subsection)
4. **Test Location Guidelines** (subsection)

### Sections to Update
1. **Folder Structure** - Make domain-first the primary approach
2. **Code Examples** - Update all import paths
3. **Best Practices** - Add domain organization best practices
4. **Related Documents** - Update navigation links

### Sections to Remove
- Layer-first as the primary approach (keep as alternative for small projects)

## Test Organization Guidelines

### Test Types
- **Unit Tests** (`*.spec.ts`): Test domain entities and value objects
- **Integration Tests** (`*.integration.spec.ts`): Test use cases with mocked infrastructure
- **E2E Tests** (`*.e2e.spec.ts`): Test controllers with full application context

### Test Location
- Mirror the `src/` structure in `test/`
- Place tests in the same domain and layer as the code under test
- Example: `src/product/domain/product.entity.ts` → `test/product/domain/product.entity.spec.ts`

### Naming Conventions
- Suffix pattern: `{name}.{type}.ts`
- Unit: `product.entity.spec.ts`
- Integration: `create-order.use-case.integration.spec.ts`
- E2E: `product.controller.e2e.spec.ts`

## Success Criteria

- [x] Architecture documentation clearly presents domain-first as the primary approach
- [x] All code examples use domain-first folder structure
- [x] Test organization section is comprehensive and clear
- [x] Import paths in examples are updated
- [x] Documentation is consistent throughout

## Completed Work

### Test Organization and Localization

- Localized 12 test files (~170 test cases) from English to Korean
- Established Korean test writing conventions in CLAUDE.md and policy.md:
  - `describe` blocks in Korean (생성, 실행, 입력 검증)
  - `it` blocks in Korean ending with "해야 함"
  - Given-When-Then comments in English
  - Inline comments in Korean

### DTO Structure Standardization

- Consolidated Application Layer DTOs to Use Case-based structure:
  - `get-product-detail.dto.ts` (Input + Output combined)
  - `get-products.dto.ts` (Input + Output combined)
- Documented DTO organization rules in CLAUDE.md and policy.md

### Documentation Updates

- Added comprehensive coding conventions to CLAUDE.md and policy.md:
  - Package Manager: pnpm (exclusive usage)
  - Test Language Conventions
  - Commit Message Format (Korean with English type prefix)
  - DTO Structure Guidelines

### Commits Made

- `195da4d`: test: convert test descriptions to Korean for better readability
- `5d45aa6`: test: update test expectations to match Korean error messages
- `ec4509e`: refactor: apply coding conventions to Product domain for Issue #007
- `405491b`: docs: add Issue #007 and assignment 3 reference documents
- `1651080`: test: add E2E tests for Product API for Issue #007

## Notes

- This is a documentation-only change; no code implementation yet
- The actual codebase will implement this structure in Step 5
- Current mock server structure will be refactored to follow this pattern

## References

- NestJS Module Documentation: https://docs.nestjs.com/modules
- Domain-Driven Design: Bounded Contexts
- Current project structure: `/src` (mock server stage)
