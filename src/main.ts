import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription(
      'E-Commerce Backend Service API Documentation\n\n' +
        '**테스트 더블 구조:**\n' +
        '- __fake__: 실제 동작하는 간단한 구현체 (JWT 인증)\n' +
        '- __stub__: 미리 준비된 응답 데이터 (JSON)\n\n' +
        '**인증 방법:**\n' +
        '1. POST /api/v1/fake-auth/login 으로 로그인\n' +
        '2. 응답으로 받은 accessToken 복사\n' +
        '3. 우측 상단 "Authorize" 버튼 클릭\n' +
        '4. 토큰 입력 후 "Authorize" 클릭\n\n' +
        '**테스트 계정:**\n' +
        '- User 1: id=user1, password=test1\n' +
        '- User 2: id=user2, password=test2',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Fake Auth', '테스트용 인증 엔드포인트 (Fake Implementation)')
    .addTag('Products', 'EPIC-1: Product browsing endpoints')
    .addTag('Cart', 'EPIC-2: Cart management endpoints (인증 필요)')
    .addTag('Orders', 'EPIC-3: Orders and payment endpoints (인증 필요)')
    .addTag('Coupons', 'EPIC-4: Coupon usage endpoints (인증 필요)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/docs`);
}

bootstrap();
