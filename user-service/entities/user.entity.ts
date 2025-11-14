import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryColumn()
  id: number; 

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;
}
