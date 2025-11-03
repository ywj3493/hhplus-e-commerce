# Issue #005: Swagger UI Mock Server Setup with NestJS

## Issue Information

- **Issue Number**: #005
- **Type**: Feature / Infrastructure
- **Status**: In Progress
- **Created**: 2025-11-02
- **Branch**: feature/005
- **Related Issues**: #002 (API Specification)

---

## Problem Statement

To facilitate early API testing and frontend development, we need to set up a Swagger UI-enabled mock server that implements all endpoints defined in the [API Specification](../dev/dashboard/api-specification.md). This mock server will provide:

1. **Interactive API Documentation**: Swagger UI for exploring and testing endpoints
2. **Mock Data Responses**: JSON-based mock data that follows the API specification
3. **Minimal Dependencies**: Only essential NestJS and Swagger packages
4. **Development Workflow**: Fast iteration for API contract validation

This setup will serve as a foundation for the actual implementation and enable parallel development of frontend components.

---

## Objectives

### Primary Goals

1. Create a NestJS-based mock server with minimal dependencies
2. Integrate Swagger UI for interactive API documentation
3. Implement all endpoints from the API specification as mock endpoints
4. Organize mock data in separate JSON files for maintainability
5. Enable easy testing of API contracts before full implementation

### Technical Requirements

- **Framework**: NestJS (latest stable version)
- **Package Manager**: pnpm
- **Documentation**: Swagger UI via @nestjs/swagger
- **Mock Data**: JSON files in `/src/mock-data` directory
- **Port**: 3000 (configurable)
- **Swagger Path**: `/api-docs`

---

## Architecture Design

### Project Structure

```
/
├── src/
│   ├── main.ts                      # Application entry point with Swagger setup
│   ├── app.module.ts                # Root module
│   ├── controllers/                 # API controllers
│   │   ├── products.controller.ts   # EPIC-1: Product browsing
│   │   ├── cart.controller.ts       # EPIC-2: Cart management
│   │   ├── orders.controller.ts     # EPIC-3: Orders & Payment
│   │   └── coupons.controller.ts    # EPIC-4: Coupon usage
│   ├── dto/                         # Data Transfer Objects
│   │   ├── product.dto.ts
│   │   ├── cart.dto.ts
│   │   ├── order.dto.ts
│   │   └── coupon.dto.ts
│   └── mock-data/                   # JSON mock data files
│       ├── products.json
│       ├── cart.json
│       ├── orders.json
│       └── coupons.json
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
└── nest-cli.json                    # NestJS CLI configuration
```

### Endpoint Coverage

All endpoints from the [API Specification](../dev/dashboard/api-specification.md) will be implemented:

**EPIC-1: Product Browsing (4 endpoints)**
- `GET /api/v1/products` - Product list with pagination
- `GET /api/v1/products/{id}` - Product details
- `GET /api/v1/products/{id}/options` - Product options
- `GET /api/v1/products/popular` - Top 5 popular products

**EPIC-2: Cart Management (4 endpoints)**
- `GET /api/v1/cart` - View cart
- `POST /api/v1/cart` - Add item to cart
- `PATCH /api/v1/cart/{itemId}` - Update cart item quantity
- `DELETE /api/v1/cart/{itemId}` - Remove item from cart

**EPIC-3: Orders & Payment (4 endpoints)**
- `POST /api/v1/orders` - Create order from cart
- `GET /api/v1/orders` - View order history
- `GET /api/v1/orders/{id}` - View order details
- `POST /api/v1/orders/{id}/payment` - Process payment

**EPIC-4: Coupon Usage (2 endpoints)**
- `POST /api/v1/coupons/{id}/issue` - Issue coupon
- `GET /api/v1/coupons` - View owned coupons

**Total: 14 endpoints**

### Mock Data Strategy

1. **Separation of Concerns**: Mock data stored in separate JSON files by domain
2. **Realistic Data**: Mock data follows the exact schema from API specification
3. **Easy Maintenance**: Update mock data without touching code
4. **Stateless**: Each request returns predefined data (no state management for mock phase)

---

## Dependencies

### Core Dependencies

```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/swagger": "^7.0.0",
  "reflect-metadata": "^0.1.13",
  "rxjs": "^7.8.1",
  "swagger-ui-express": "^5.0.0"
}
```

### Development Dependencies

```json
{
  "@nestjs/cli": "^10.0.0",
  "@types/express": "^4.17.17",
  "@types/node": "^20.0.0",
  "ts-node": "^10.9.1",
  "typescript": "^5.1.3"
}
```

**Rationale**: Minimal setup with only NestJS core, Swagger UI, and TypeScript essentials.

---

## Implementation Steps

### Phase 1: Project Initialization

1. Initialize pnpm project
   ```bash
   pnpm init
   ```

2. Install NestJS core dependencies
   ```bash
   pnpm add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
   ```

3. Install Swagger dependencies
   ```bash
   pnpm add @nestjs/swagger swagger-ui-express
   ```

4. Install development dependencies
   ```bash
   pnpm add -D @nestjs/cli @types/express @types/node ts-node typescript
   ```

### Phase 2: Configuration Files

1. Create `tsconfig.json` with NestJS-compatible settings
2. Create `nest-cli.json` for NestJS CLI configuration
3. Update `package.json` with build and start scripts

### Phase 3: Core Application Setup

1. Create `src/main.ts` with:
   - NestJS application bootstrap
   - Swagger document configuration
   - Swagger UI setup at `/api-docs`
   - Port configuration (default 3000)

2. Create `src/app.module.ts` with:
   - Import all controllers
   - Basic module configuration

### Phase 4: Mock Data Creation

Create JSON files in `src/mock-data/`:

1. **products.json**: Sample products with various categories
2. **cart.json**: Sample cart items
3. **orders.json**: Sample orders with different statuses
4. **coupons.json**: Sample coupons with various types

### Phase 5: DTO Definitions

Create TypeScript DTOs matching the API specification with Swagger decorators:

1. **product.dto.ts**: Product-related DTOs
   - `ProductListItemDto`
   - `ProductDetailDto`
   - `ProductOptionDto`

2. **cart.dto.ts**: Cart-related DTOs
   - `CartDto`
   - `CartItemDto`
   - `AddToCartDto`
   - `UpdateCartItemDto`

3. **order.dto.ts**: Order-related DTOs
   - `OrderDto`
   - `OrderItemDto`
   - `CreateOrderDto`
   - `PaymentDto`

4. **coupon.dto.ts**: Coupon-related DTOs
   - `CouponDto`
   - `IssueCouponDto`

### Phase 6: Controller Implementation

Implement controllers with:
- `@Controller()` decorator with route prefix
- `@ApiTags()` for Swagger grouping
- HTTP method decorators (`@Get()`, `@Post()`, etc.)
- `@ApiOperation()` for endpoint description
- `@ApiResponse()` for response documentation
- Mock data loading from JSON files
- Simple response logic (no business logic, just return mock data)

### Phase 7: Testing & Verification

1. Start development server: `pnpm start:dev`
2. Access Swagger UI: `http://localhost:3000/api-docs`
3. Verify all 14 endpoints are documented
4. Test each endpoint through Swagger UI
5. Validate response schemas match API specification

---

## Acceptance Criteria

### Documentation
- [x] Issue document created (`issue005.md`)
- [ ] All endpoints documented with Swagger decorators
- [ ] DTOs defined with `@ApiProperty()` decorators

### Implementation
- [ ] `package.json` configured with all necessary dependencies
- [ ] `tsconfig.json` created with NestJS settings
- [ ] `main.ts` bootstraps NestJS with Swagger integration
- [ ] All 14 endpoints implemented as mock endpoints
- [ ] Mock data JSON files created for all domains
- [ ] DTOs created matching API specification

### Verification
- [ ] Server starts without errors: `pnpm start:dev`
- [ ] Swagger UI accessible at `http://localhost:3000/api-docs`
- [ ] All endpoints visible in Swagger UI
- [ ] Each endpoint returns mock data matching API spec
- [ ] Response schemas validated in Swagger UI

---

## Testing Checklist

### Swagger UI Tests

**EPIC-1: Products**
- [ ] `GET /api/v1/products` - Returns paginated product list
- [ ] `GET /api/v1/products/{id}` - Returns product details
- [ ] `GET /api/v1/products/{id}/options` - Returns product options
- [ ] `GET /api/v1/products/popular` - Returns top 5 products

**EPIC-2: Cart**
- [ ] `GET /api/v1/cart` - Returns cart contents
- [ ] `POST /api/v1/cart` - Adds item to cart
- [ ] `PATCH /api/v1/cart/{itemId}` - Updates item quantity
- [ ] `DELETE /api/v1/cart/{itemId}` - Removes item

**EPIC-3: Orders**
- [ ] `POST /api/v1/orders` - Creates order
- [ ] `GET /api/v1/orders` - Returns order history
- [ ] `GET /api/v1/orders/{id}` - Returns order details
- [ ] `POST /api/v1/orders/{id}/payment` - Processes payment

**EPIC-4: Coupons**
- [ ] `POST /api/v1/coupons/{id}/issue` - Issues coupon
- [ ] `GET /api/v1/coupons` - Returns owned coupons

---

## Known Limitations

1. **No Authentication**: Mock server does not implement authentication/authorization
2. **Stateless Responses**: No state management; each request returns predefined mock data
3. **No Data Validation**: Input validation is minimal (only Swagger validation)
4. **No Database**: All data comes from JSON files
5. **No Business Logic**: Controllers only return mock data without processing

These limitations are intentional for the mock phase and will be addressed during actual implementation.

---

## Future Enhancements (Out of Scope)

- Database integration (Prisma)
- Authentication and authorization
- Business logic implementation
- State management
- Input validation and error handling
- Unit and integration tests
- Docker containerization
- Environment configuration

---

## References

### Related Documents
- [API Specification](../dev/dashboard/api-specification.md) - Source of truth for endpoint definitions
- [Requirements](../dev/dashboard/requirements.md) - Business requirements
- [User Stories](../dev/dashboard/user-stories.md) - User scenarios
- [Data Model](../dev/dashboard/data-model.md) - Database schema (for future reference)

### External Resources
- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)

---

## Deliverables

1. **Source Code**: Complete NestJS mock server in `/src` directory
2. **Configuration**: `package.json`, `tsconfig.json`, `nest-cli.json`
3. **Mock Data**: JSON files in `/src/mock-data`
4. **Documentation**: This issue document with implementation details
5. **Running Server**: Accessible at `http://localhost:3000` with Swagger UI at `/api-docs`

---

## Notes

- This mock server is a stepping stone for full implementation
- Focus on API contract validation rather than business logic
- Swagger documentation should match API specification exactly
- Use pnpm for all package management operations
- Follow NestJS best practices for project structure

---

**Issue Status**: 🚧 **In Progress**

**Next Steps**:
1. Complete implementation following the steps above
2. Verify all endpoints work in Swagger UI
3. Create pull request referencing this issue
4. Prepare for Issue #006: Database schema implementation with Prisma
