import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// Migration: Add phone column to users table
// Generated: 2024-01-01
//
// up()   → applies the change   (run forward)
// down() → reverts the change   (rollback)

export class AddPhoneToUsers1704067200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name:       'phone',
        type:       'varchar',
        isNullable: true,       // nullable so existing rows are not broken
        default:    null,
      }),
    );

    console.log('✅ Migration UP: phone column added to users table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'phone');

    console.log('⏪ Migration DOWN: phone column removed from users table');
  }
}
