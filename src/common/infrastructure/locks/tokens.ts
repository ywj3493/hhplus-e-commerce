/**
 * Redis 관련 DI 토큰
 * 프로젝트 컨벤션: Symbol 기반 토큰 사용
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const DISTRIBUTED_LOCK_SERVICE = Symbol('DISTRIBUTED_LOCK_SERVICE');
export const REDLOCK_INSTANCE = Symbol('REDLOCK_INSTANCE');
