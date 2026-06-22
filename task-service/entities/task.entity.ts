import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { TaskStatus } from './enums/task-status.enum';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number; 

  @Column()
  userId!: number; 

  @Column()
  title!: string; 

  @Column({ nullable: true })
  description!: string; 

  @Column({ type: 'date', nullable: true }) 
  date!: Date | null; 

  @Column({ type: 'time', nullable: true }) 
  time!: string; 

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING
  })
  status!: TaskStatus; 

  @Column({ type: 'varchar', length: 20, default: '#3b82f6' })
  color!: string; 

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean; 

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date; 

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null; 
}