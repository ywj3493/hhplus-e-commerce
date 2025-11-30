/**
 * Redis 캐시 서비스 인터페이스
 *
 * Redis 기반 캐시 기능 제공
 * - get, set, del: 기본 캐시 연산
 * - delByPattern: Redis SCAN을 활용한 패턴 삭제 (확장 기능)
 */
export interface RedisCacheServiceInterface {
  /**
   * 캐시에서 값 조회
   * @param key 캐시 키
   * @returns 캐시된 값 또는 undefined
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * 캐시에 값 저장
   * @param key 캐시 키
   * @param value 저장할 값
   * @param ttlMs TTL (밀리초)
   */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

  /**
   * 캐시에서 특정 키 삭제
   * @param key 캐시 키
   */
  del(key: string): Promise<void>;

  /**
   * 패턴에 매칭되는 모든 키 삭제 (Redis 전용 기능)
   *
   * @param pattern 삭제할 키 패턴 (예: 'products:list:*', 'products:detail:123')
   */
  delByPattern(pattern: string): Promise<void>;
}
