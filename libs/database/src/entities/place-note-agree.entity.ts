import {
  Entity, PrimaryGeneratedColumn, Column, Unique,
  CreateDateColumn,
} from 'typeorm';

@Entity('place_note_agrees')
@Unique(['noteId', 'userId'])
export class PlaceNoteAgree {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  noteId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
