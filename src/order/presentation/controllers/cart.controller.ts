import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';
import { AddCartItemUseCase } from '@/order/application/use-cases/add-cart-item.use-case';
import { GetCartUseCase } from '@/order/application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from '@/order/application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from '@/order/application/use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from '@/order/application/use-cases/clear-cart.use-case';
import { AddCartItemInput } from '@/order/application/dtos/add-cart-item.dto';
import { GetCartInput } from '@/order/application/dtos/get-cart.dto';
import { UpdateCartItemInput } from '@/order/application/dtos/update-cart-item.dto';
import { RemoveCartItemInput } from '@/order/application/dtos/remove-cart-item.dto';
import { ClearCartInput } from '@/order/application/dtos/clear-cart.dto';
import { AddCartItemRequestDto } from '@/order/presentation/dtos/add-cart-item-request.dto';
import { UpdateCartItemRequestDto } from '@/order/presentation/dtos/update-cart-item-request.dto';
import { GetCartItemParamDto } from '@/order/presentation/dtos/get-cart-item-param.dto';
import { CartItemResponseDto } from '@/order/presentation/dtos/cart-item-response.dto';
import { CartResponseDto } from '@/order/presentation/dtos/cart-response.dto';

/**
 * Cart Controller
 * 장바구니 관련 HTTP 요청을 처리
 *
 * 엔드포인트:
 * - POST /carts/items: 장바구니 아이템 추가
 * - GET /carts: 장바구니 조회
 * - PATCH /carts/items/:id: 수량 변경
 * - DELETE /carts/items/:id: 아이템 삭제
 * - DELETE /carts: 장바구니 전체 비우기
 *
 * 인증: JWT 토큰 필요 (Bearer token)
 */
@ApiTags('carts')
@Controller('carts')
@UseGuards(FakeJwtAuthGuard)
@ApiBearerAuth('access-token')
export class CartController {
  constructor(
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly getCartUseCase: GetCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  /**
   * 장바구니에 상품 추가
   * UC-CART-01: 장바구니 아이템 추가
   */
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Add a product to the shopping cart with quantity',
  })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: CartItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Insufficient stock',
  })
  async addItem(
    @Body() dto: AddCartItemRequestDto,
    @Request() req,
  ): Promise<CartItemResponseDto> {
    const userId = req.user.userId;

    const input = new AddCartItemInput({
      userId,
      productId: dto.productId,
      productOptionId: dto.productOptionId ?? null,
      quantity: dto.quantity,
    });

    const output = await this.addCartItemUseCase.execute(input);
    return CartItemResponseDto.from(output);
  }

  /**
   * 장바구니 조회
   * UC-CART-02: 장바구니 조회
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get cart',
    description: 'Retrieve current user cart with all items',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: CartResponseDto,
  })
  async getCart(@Request() req): Promise<CartResponseDto> {
    const userId = req.user.userId;

    const input = new GetCartInput(userId);
    const output = await this.getCartUseCase.execute(input);
    return CartResponseDto.from(output);
  }

  /**
   * 장바구니 아이템 수량 변경
   * UC-CART-03: 장바구니 아이템 수량 변경
   */
  @Patch('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update cart item quantity',
    description: 'Update quantity of a specific cart item',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item quantity updated successfully',
    type: CartItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid quantity',
  })
  @ApiResponse({
    status: 404,
    description: 'Cart or cart item not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Insufficient stock',
  })
  async updateItem(
    @Param() param: GetCartItemParamDto,
    @Body() dto: UpdateCartItemRequestDto,
    @Request() req,
  ): Promise<CartItemResponseDto> {
    const userId = req.user.userId;

    const input = new UpdateCartItemInput({
      userId,
      cartItemId: param.id,
      quantity: dto.quantity,
    });

    const output = await this.updateCartItemUseCase.execute(input);
    return CartItemResponseDto.from(output);
  }

  /**
   * 장바구니 아이템 삭제
   * UC-CART-04: 장바구니 아이템 삭제
   */
  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove cart item',
    description: 'Remove a specific item from the cart',
  })
  @ApiResponse({
    status: 204,
    description: 'Cart item removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cart or cart item not found',
  })
  async removeItem(
    @Param() param: GetCartItemParamDto,
    @Request() req,
  ): Promise<void> {
    const userId = req.user.userId;

    const input = new RemoveCartItemInput({
      userId,
      cartItemId: param.id,
    });

    await this.removeCartItemUseCase.execute(input);
  }

  /**
   * 장바구니 전체 비우기
   * UC-CART-05: 장바구니 전체 삭제
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear cart',
    description: 'Remove all items from the cart',
  })
  @ApiResponse({
    status: 204,
    description: 'Cart cleared successfully',
  })
  async clearCart(@Request() req): Promise<void> {
    const userId = req.user.userId;

    const input = new ClearCartInput(userId);
    await this.clearCartUseCase.execute(input);
  }
}
