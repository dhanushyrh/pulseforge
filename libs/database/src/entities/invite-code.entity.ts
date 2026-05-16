import {
  Entity, PrimaryGeneratedColumn, Column,
  Index, CreateDateColumn,
} from 'typeorm';

@Entity('invite_codes')
export class InviteCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  code: string;

  @Column({ default: 'free' })
  plan: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ nullable: true })
  usedByEmail: string;

  @Column({ nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  createdByAdminId: string;

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
