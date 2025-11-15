import { Product } from '../../domain/entities/product.entity';
import { ProductOption } from '../../domain/entities/product-option.entity';
import { Stock } from '../../domain/entities/stock.entity';
import { Money } from '../../domain/value-objects/money.vo';

/**
 * Product fixtures for testing and initial data
 */
export class ProductFixtures {
  /**
   * Create sample products with options and stock
   */
  static createSampleProducts(): Product[] {
    return [
      // Product 1: Basic T-Shirt
      Product.create(
        '550e8400-e29b-41d4-a716-446655440001',
        'Basic T-Shirt',
        Money.from(29000),
        'Comfortable cotton t-shirt for everyday wear',
        'https://example.com/images/basic-tshirt.jpg',
        [
          ProductOption.create(
            'opt-001-color-white',
            '550e8400-e29b-41d4-a716-446655440001',
            'Color',
            'White',
            Money.from(0),
            Stock.initialize('stock-001-white', 'opt-001-color-white', 100),
          ),
          ProductOption.create(
            'opt-001-color-black',
            '550e8400-e29b-41d4-a716-446655440001',
            'Color',
            'Black',
            Money.from(0),
            Stock.initialize('stock-001-black', 'opt-001-color-black', 80),
          ),
          ProductOption.create(
            'opt-001-color-navy',
            '550e8400-e29b-41d4-a716-446655440001',
            'Color',
            'Navy',
            Money.from(0),
            Stock.create('stock-001-navy', 'opt-001-color-navy', 50, 0, 30, 20),
          ),
        ],
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T00:00:00Z'),
      ),

      // Product 2: Premium Hoodie
      Product.create(
        '550e8400-e29b-41d4-a716-446655440002',
        'Premium Hoodie',
        Money.from(79000),
        'High-quality hoodie with soft interior lining',
        'https://example.com/images/premium-hoodie.jpg',
        [
          ProductOption.create(
            'opt-002-size-s',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'S',
            Money.from(0),
            Stock.create('stock-002-s', 'opt-002-size-s', 50, 0, 20, 30),
          ),
          ProductOption.create(
            'opt-002-size-m',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'M',
            Money.from(0),
            Stock.initialize('stock-002-m', 'opt-002-size-m', 60),
          ),
          ProductOption.create(
            'opt-002-size-l',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'L',
            Money.from(2000),
            Stock.initialize('stock-002-l', 'opt-002-size-l', 40),
          ),
          ProductOption.create(
            'opt-002-size-xl',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'XL',
            Money.from(2000),
            Stock.initialize('stock-002-xl', 'opt-002-size-xl', 30),
          ),
        ],
        new Date('2024-01-02T00:00:00Z'),
        new Date('2024-01-02T00:00:00Z'),
      ),

      // Product 3: Denim Jeans
      Product.create(
        '550e8400-e29b-41d4-a716-446655440003',
        'Classic Denim Jeans',
        Money.from(59000),
        'Durable denim jeans with classic fit',
        'https://example.com/images/denim-jeans.jpg',
        [
          ProductOption.create(
            'opt-003-size-28',
            '550e8400-e29b-41d4-a716-446655440003',
            'Size',
            '28',
            Money.from(0),
            Stock.initialize('stock-003-28', 'opt-003-size-28', 25),
          ),
          ProductOption.create(
            'opt-003-size-30',
            '550e8400-e29b-41d4-a716-446655440003',
            'Size',
            '30',
            Money.from(0),
            Stock.initialize('stock-003-30', 'opt-003-size-30', 35),
          ),
          ProductOption.create(
            'opt-003-size-32',
            '550e8400-e29b-41d4-a716-446655440003',
            'Size',
            '32',
            Money.from(0),
            Stock.initialize('stock-003-32', 'opt-003-size-32', 40),
          ),
        ],
        new Date('2024-01-03T00:00:00Z'),
        new Date('2024-01-03T00:00:00Z'),
      ),

      // Product 4: Sneakers
      Product.create(
        '550e8400-e29b-41d4-a716-446655440004',
        'Casual Sneakers',
        Money.from(89000),
        'Comfortable sneakers for casual wear',
        'https://example.com/images/sneakers.jpg',
        [
          ProductOption.create(
            'opt-004-size-250',
            '550e8400-e29b-41d4-a716-446655440004',
            'Size',
            '250mm',
            Money.from(0),
            Stock.initialize('stock-004-250', 'opt-004-size-250', 20),
          ),
          ProductOption.create(
            'opt-004-size-260',
            '550e8400-e29b-41d4-a716-446655440004',
            'Size',
            '260mm',
            Money.from(0),
            Stock.initialize('stock-004-260', 'opt-004-size-260', 30),
          ),
          ProductOption.create(
            'opt-004-size-270',
            '550e8400-e29b-41d4-a716-446655440004',
            'Size',
            '270mm',
            Money.from(0),
            Stock.initialize('stock-004-270', 'opt-004-size-270', 25),
          ),
        ],
        new Date('2024-01-04T00:00:00Z'),
        new Date('2024-01-04T00:00:00Z'),
      ),

      // Product 5: Baseball Cap
      Product.create(
        '550e8400-e29b-41d4-a716-446655440005',
        'Baseball Cap',
        Money.from(25000),
        'Stylish baseball cap with adjustable strap',
        'https://example.com/images/baseball-cap.jpg',
        [
          ProductOption.create(
            'opt-005-color-black',
            '550e8400-e29b-41d4-a716-446655440005',
            'Color',
            'Black',
            Money.from(0),
            Stock.initialize('stock-005-black', 'opt-005-color-black', 50),
          ),
          ProductOption.create(
            'opt-005-color-beige',
            '550e8400-e29b-41d4-a716-446655440005',
            'Color',
            'Beige',
            Money.from(0),
            Stock.initialize('stock-005-beige', 'opt-005-color-beige', 45),
          ),
        ],
        new Date('2024-01-05T00:00:00Z'),
        new Date('2024-01-05T00:00:00Z'),
      ),

      // Product 6-15: Additional products for pagination testing
      ...Array.from({ length: 10 }, (_, i) => {
        const idx = i + 6;
        const productId = `550e8400-e29b-41d4-a716-4466554400${idx.toString().padStart(2, '0')}`;
        return Product.create(
          productId,
          `Product ${idx}`,
          Money.from(10000 + idx * 1000),
          `Description for product ${idx}`,
          `https://example.com/images/product-${idx}.jpg`,
          [
            ProductOption.create(
              `opt-${idx}-default`,
              productId,
              'Default',
              'Standard',
              Money.from(0),
              Stock.initialize(`stock-${idx}-default`, `opt-${idx}-default`, 50),
            ),
          ],
          new Date(`2024-01-${idx.toString().padStart(2, '0')}T00:00:00Z`),
          new Date(`2024-01-${idx.toString().padStart(2, '0')}T00:00:00Z`),
        );
      }),
    ];
  }
}
