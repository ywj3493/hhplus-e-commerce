# Issue #007: Restructure Architecture Documentation to Domain-First Approach

## Metadata
- **Issue Number**: #007
- **Status**: In Progress
- **Created**: 2025-11-04
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
- [ ] Define test types (unit, integration, e2e)
- [ ] Specify test location conventions
- [ ] Provide naming conventions
- [ ] Add test examples for each layer

### 3. Update References
- [ ] Update cross-references in related documents
- [ ] Ensure consistency with other docs

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

- [ ] Architecture documentation clearly presents domain-first as the primary approach
- [ ] All code examples use domain-first folder structure
- [ ] Test organization section is comprehensive and clear
- [ ] Import paths in examples are updated
- [ ] Documentation is consistent throughout

## Notes

- This is a documentation-only change; no code implementation yet
- The actual codebase will implement this structure in Step 5
- Current mock server structure will be refactored to follow this pattern

## References

- NestJS Module Documentation: https://docs.nestjs.com/modules
- Domain-Driven Design: Bounded Contexts
- Current project structure: `/src` (mock server stage)
