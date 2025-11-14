import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { Task } from './entities/task.entity';

dotenv.config({ path: '.env.database' });

export const DatabaseConnection = TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [Task],
  synchronize: true,
});
