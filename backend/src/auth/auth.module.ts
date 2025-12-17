import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

const JWT_SECRET: string = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_EXPIRES_IN: StringValue = (process.env.JWT_EXPIRES_IN ?? '1d') as StringValue;

@Module({
  imports: [
    PassportModule,
    UsersModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
