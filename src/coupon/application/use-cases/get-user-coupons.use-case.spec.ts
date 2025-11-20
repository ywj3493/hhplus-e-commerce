import { GetUserCouponsUseCase } from '@/coupon/application/use-cases/get-user-coupons.use-case';
import { CouponRepository } from '@/coupon/domain/repositories/coupon.repository';
import { UserCouponRepository } from '@/coupon/domain/repositories/user-coupon.repository';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';
import { UserCoupon, CouponStatus } from '@/coupon/domain/entities/user-coupon.entity';
import { GetUserCouponsInput } from '@/coupon/application/dtos/get-user-coupons.dto';
import { UserCouponQueryService } from '@/coupon/domain/services/user-coupon-query.service';

describe('GetUserCouponsUseCase', () => {
  let useCase: GetUserCouponsUseCase;
  let couponRepository: jest.Mocked<CouponRepository>;
  let userCouponRepository: jest.Mocked<UserCouponRepository>;
  let userCouponQueryService: UserCouponQueryService;

  beforeEach(() => {
    // Mock repositories
    couponRepository = {
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<CouponRepository>;

    userCouponRepository = {
      findByUserId: jest.fn(),
      existsByUserIdAndCouponId: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
    } as jest.Mocked<UserCouponRepository>;

    // Real domain service
    userCouponQueryService = new UserCouponQueryService();

    // Create use case
    useCase = new GetUserCouponsUseCase(
      userCouponRepository,
      couponRepository,
      userCouponQueryService,
    );
  });

  const createTestCoupon = (
    id: string,
    overrides?: Partial<{
      name: string;
      validFrom: Date;
      validUntil: Date;
    }>,
  ): Coupon => {
    return Coupon.reconstitute(
      id,
      overrides?.name || '10% 할인 쿠폰',
      '테스트 쿠폰',
      CouponType.PERCENTAGE,
      10,
      null, // minAmount
      100,
      0,
      overrides?.validFrom || new Date('2025-01-01'),
      overrides?.validUntil || new Date('2025-12-31'),
      new Date(),
      new Date(),
    );
  };

  describe('실행', () => {
    it('사용자의 모든 쿠폰을 조회해야 함', async () => {
      // Given
      const userId = 'user-1';
      const input = new GetUserCouponsInput({ userId });

      const coupon1 = createTestCoupon('coupon-1', { name: '10% 할인 쿠폰' });
      const coupon2 = createTestCoupon('coupon-2', { name: '5000원 할인 쿠폰' });

      const userCoupon1 = UserCoupon.reconstitute(
        'uc-1',
        userId,
        'coupon-1',
        false,
        null,
        new Date('2025-01-15'),
        new Date('2025-12-31'),
      );

      const userCoupon2 = UserCoupon.reconstitute(
        'uc-2',
        userId,
        'coupon-2',
        true, // 사용됨
        new Date('2025-01-20'),
        new Date('2025-01-10'),
        new Date('2025-12-31'),
      );

      userCouponRepository.findByUserId.mockResolvedValue([
        userCoupon1,
        userCoupon2,
      ]);

      couponRepository.findById
        .mockResolvedValueOnce(coupon1)
        .mockResolvedValueOnce(coupon2);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output).toBeDefined();
      expect(output.available).toHaveLength(1);
      expect(output.used).toHaveLength(1);
      expect(output.expired).toHaveLength(0);

      // Verify available coupon
      expect(output.available[0].id).toBe('uc-1');
      expect(output.available[0].couponName).toBe('10% 할인 쿠폰');
      expect(output.available[0].status).toBe(CouponStatus.AVAILABLE);

      // Verify used coupon
      expect(output.used[0].id).toBe('uc-2');
      expect(output.used[0].couponName).toBe('5000원 할인 쿠폰');
      expect(output.used[0].status).toBe(CouponStatus.USED);

      expect(userCouponRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('만료된 쿠폰을 EXPIRED 상태로 분류해야 함', async () => {
      // Given
      const userId = 'user-1';
      const input = new GetUserCouponsInput({ userId });

      const expiredCoupon = createTestCoupon('coupon-1', {
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-12-31'),
      });

      const userCoupon = UserCoupon.reconstitute(
        'uc-1',
        userId,
        'coupon-1',
        false,
        null,
        new Date('2020-01-15'),
        new Date('2020-12-31'), // 만료됨
      );

      userCouponRepository.findByUserId.mockResolvedValue([userCoupon]);
      couponRepository.findById.mockResolvedValue(expiredCoupon);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.available).toHaveLength(0);
      expect(output.used).toHaveLength(0);
      expect(output.expired).toHaveLength(1);
      expect(output.expired[0].status).toBe(CouponStatus.EXPIRED);
    });

    it('쿠폰이 없는 사용자는 빈 배열을 반환해야 함', async () => {
      // Given
      const userId = 'user-with-no-coupons';
      const input = new GetUserCouponsInput({ userId });

      userCouponRepository.findByUserId.mockResolvedValue([]);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.available).toHaveLength(0);
      expect(output.used).toHaveLength(0);
      expect(output.expired).toHaveLength(0);
    });

    it('사용 가능한 쿠폰을 최신 발급 순으로 정렬해야 함 (BR-COUPON-07)', async () => {
      // Given
      const userId = 'user-1';
      const input = new GetUserCouponsInput({ userId });

      const coupon = createTestCoupon('coupon-1');

      // 발급 시간이 다른 세 개의 쿠폰 (오래된 순 -> 최신 순)
      const oldUserCoupon = UserCoupon.reconstitute(
        'uc-old',
        userId,
        'coupon-1',
        false,
        null,
        new Date('2025-01-01'), // 가장 오래됨
        new Date('2025-12-31'),
      );

      const middleUserCoupon = UserCoupon.reconstitute(
        'uc-middle',
        userId,
        'coupon-1',
        false,
        null,
        new Date('2025-01-15'),
        new Date('2025-12-31'),
      );

      const newUserCoupon = UserCoupon.reconstitute(
        'uc-new',
        userId,
        'coupon-1',
        false,
        null,
        new Date('2025-01-31'), // 가장 최신
        new Date('2025-12-31'),
      );

      userCouponRepository.findByUserId.mockResolvedValue([
        oldUserCoupon,
        middleUserCoupon,
        newUserCoupon,
      ]);

      couponRepository.findById.mockResolvedValue(coupon);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.available).toHaveLength(3);
      // 최신 발급 순으로 정렬되었는지 확인
      expect(output.available[0].id).toBe('uc-new');
      expect(output.available[1].id).toBe('uc-middle');
      expect(output.available[2].id).toBe('uc-old');
    });

    it('사용된 쿠폰을 최신 사용 순으로 정렬해야 함 (BR-COUPON-07)', async () => {
      // Given
      const userId = 'user-1';
      const input = new GetUserCouponsInput({ userId });

      const coupon = createTestCoupon('coupon-1');

      // 사용 시간이 다른 세 개의 쿠폰
      const oldUsed = UserCoupon.reconstitute(
        'uc-old',
        userId,
        'coupon-1',
        true,
        new Date('2025-01-01'), // 가장 오래 사용됨
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      const middleUsed = UserCoupon.reconstitute(
        'uc-middle',
        userId,
        'coupon-1',
        true,
        new Date('2025-01-15'),
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      const newUsed = UserCoupon.reconstitute(
        'uc-new',
        userId,
        'coupon-1',
        true,
        new Date('2025-01-31'), // 가장 최근 사용됨
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      userCouponRepository.findByUserId.mockResolvedValue([
        oldUsed,
        middleUsed,
        newUsed,
      ]);

      couponRepository.findById.mockResolvedValue(coupon);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.used).toHaveLength(3);
      // 최신 사용 순으로 정렬되었는지 확인
      expect(output.used[0].id).toBe('uc-new');
      expect(output.used[1].id).toBe('uc-middle');
      expect(output.used[2].id).toBe('uc-old');
    });

    it('존재하지 않는 쿠폰은 건너뛰어야 함', async () => {
      // Given
      const userId = 'user-1';
      const input = new GetUserCouponsInput({ userId });

      const validCoupon = createTestCoupon('coupon-1');

      const userCoupon1 = UserCoupon.reconstitute(
        'uc-1',
        userId,
        'coupon-1',
        false,
        null,
        new Date('2025-01-15'),
        new Date('2025-12-31'),
      );

      const userCoupon2 = UserCoupon.reconstitute(
        'uc-2',
        userId,
        'coupon-not-found', // 존재하지 않는 쿠폰
        false,
        null,
        new Date('2025-01-15'),
        new Date('2025-12-31'),
      );

      userCouponRepository.findByUserId.mockResolvedValue([
        userCoupon1,
        userCoupon2,
      ]);

      couponRepository.findById
        .mockResolvedValueOnce(validCoupon)
        .mockResolvedValueOnce(null); // 두 번째는 null 반환

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.available).toHaveLength(1);
      expect(output.available[0].id).toBe('uc-1');
    });
  });
});
