// libs/database/src/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Job } from './entities/job.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { Intelligence } from './entities/intelligence.entity';

export const DB_ENTITIES = [Job, MediaAsset, Intelligence];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get('DB_HOST'),
        port:     +config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities: DB_ENTITIES,
        synchronize: true,   // auto-creates tables in dev; use migrations in prod
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}