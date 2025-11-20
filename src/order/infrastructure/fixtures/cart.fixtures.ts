import { Cart } from '@/order/domain/entities/cart.entity';
import { CartItem, CartItemCreateData } from '@/order/domain/entities/cart-item.entity';
import { Money } from '@/product/domain/entities/money.vo';

/**
 * 테스트용 Cart 생성 헬퍼
 */
export const createTestCart = (userId: string = 'user-1'): Cart => {
  return Cart.create(userId);
};

/**
 * 테스트용 CartItem 생성 헬퍼
 */
export const createTestCartItem = (
  data?: Partial<CartItemCreateData>,
): CartItem => {
  const defaultData: CartItemCreateData = {
    cartId: 'cart-1',
    productId: 'prod-1',
    productName: '테스트 상품',
    productOptionId: 'opt-1',
    price: Money.from(10000),
    quantity: 1,
  };

  return CartItem.create({ ...defaultData, ...data });
};

/**
 * 테스트용 아이템이 담긴 Cart 생성 헬퍼
 */
export const createTestCartWithItems = (userId: string = 'user-1'): Cart => {
  const cart = Cart.create(userId);

  cart.addItem({
    productId: 'prod-1',
    productName: '상품 A',
    productOptionId: 'opt-1',
    price: Money.from(10000),
    quantity: 2,
  });

  cart.addItem({
    productId: 'prod-2',
    productName: '상품 B',
    productOptionId: null,
    price: Money.from(5000),
    quantity: 3,
  });

  return cart;
};
