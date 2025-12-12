import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { TaskStatus } from './enums/task-status.enum';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true }) // CHỈ CẦN DÒNG NÀY
  date: Date | null; // CHO PHÉP NULL

  @Column({ type: 'time', nullable: true }) // THÊM: lưu giờ dạng HH:mm:ss
  time: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING
  })
  status: TaskStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;
}