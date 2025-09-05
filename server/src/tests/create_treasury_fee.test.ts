import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { treasuryFeesTable, usersTable } from '../db/schema';
import { type CreateTreasuryFeeInput } from '../schema';
import { createTreasuryFee } from '../handlers/create_treasury_fee';
import { eq } from 'drizzle-orm';

describe('createTreasuryFee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a treasury fee', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'guild_master',
        guild_role: 'guild_master'
      })
      .returning()
      .execute();

    const testInput: CreateTreasuryFeeInput = {
      amount: 50.00,
      week_start: new Date('2024-01-01'),
      week_end: new Date('2024-01-07'),
      set_by: userResult[0].id
    };

    const result = await createTreasuryFee(testInput);

    // Basic field validation
    expect(result.amount).toEqual(50.00);
    expect(typeof result.amount).toBe('number');
    expect(result.week_start).toEqual(new Date('2024-01-01'));
    expect(result.week_end).toEqual(new Date('2024-01-07'));
    expect(result.set_by).toEqual(userResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save treasury fee to database', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'guild_master',
        guild_role: 'guild_master'
      })
      .returning()
      .execute();

    const testInput: CreateTreasuryFeeInput = {
      amount: 75.50,
      week_start: new Date('2024-01-08'),
      week_end: new Date('2024-01-14'),
      set_by: userResult[0].id
    };

    const result = await createTreasuryFee(testInput);

    // Query using proper drizzle syntax
    const treasuryFees = await db.select()
      .from(treasuryFeesTable)
      .where(eq(treasuryFeesTable.id, result.id))
      .execute();

    expect(treasuryFees).toHaveLength(1);
    expect(parseFloat(treasuryFees[0].amount)).toEqual(75.50);
    expect(new Date(treasuryFees[0].week_start)).toEqual(new Date('2024-01-08'));
    expect(new Date(treasuryFees[0].week_end)).toEqual(new Date('2024-01-14'));
    expect(treasuryFees[0].set_by).toEqual(userResult[0].id);
    expect(treasuryFees[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal amounts correctly', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '987654321',
        discord_username: 'vice_guild_master',
        guild_role: 'vice_guild_master'
      })
      .returning()
      .execute();

    const testInput: CreateTreasuryFeeInput = {
      amount: 99.99,
      week_start: new Date('2024-02-01'),
      week_end: new Date('2024-02-07'),
      set_by: userResult[0].id
    };

    const result = await createTreasuryFee(testInput);

    // Verify decimal precision is maintained
    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number');

    // Verify database storage
    const treasuryFees = await db.select()
      .from(treasuryFeesTable)
      .where(eq(treasuryFeesTable.id, result.id))
      .execute();

    expect(parseFloat(treasuryFees[0].amount)).toEqual(99.99);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateTreasuryFeeInput = {
      amount: 50.00,
      week_start: new Date('2024-01-01'),
      week_end: new Date('2024-01-07'),
      set_by: 999999 // Non-existent user ID
    };

    expect(createTreasuryFee(testInput)).rejects.toThrow(/user not found/i);
  });

  it('should handle integer amounts correctly', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '111222333',
        discord_username: 'senior_member',
        guild_role: 'senior_guild_member'
      })
      .returning()
      .execute();

    const testInput: CreateTreasuryFeeInput = {
      amount: 100,
      week_start: new Date('2024-03-01'),
      week_end: new Date('2024-03-07'),
      set_by: userResult[0].id
    };

    const result = await createTreasuryFee(testInput);

    // Verify integer amount handling
    expect(result.amount).toEqual(100);
    expect(typeof result.amount).toBe('number');

    // Verify database storage
    const treasuryFees = await db.select()
      .from(treasuryFeesTable)
      .where(eq(treasuryFeesTable.id, result.id))
      .execute();

    expect(parseFloat(treasuryFees[0].amount)).toEqual(100);
  });

  it('should handle date range validation correctly', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '444555666',
        discord_username: 'test_user',
        guild_role: 'guild_master'
      })
      .returning()
      .execute();

    const weekStart = new Date('2024-04-01');
    const weekEnd = new Date('2024-04-07');

    const testInput: CreateTreasuryFeeInput = {
      amount: 25.75,
      week_start: weekStart,
      week_end: weekEnd,
      set_by: userResult[0].id
    };

    const result = await createTreasuryFee(testInput);

    // Verify date handling
    expect(result.week_start).toEqual(weekStart);
    expect(result.week_end).toEqual(weekEnd);
    expect(result.week_start).toBeInstanceOf(Date);
    expect(result.week_end).toBeInstanceOf(Date);
  });
});