import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, treasuryFeesTable } from '../db/schema';
import { getCurrentTreasuryFee } from '../handlers/get_current_treasury_fee';

describe('getCurrentTreasuryFee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no treasury fee exists', async () => {
    const result = await getCurrentTreasuryFee();
    expect(result).toBeNull();
  });

  it('should return current treasury fee when date is within range', async () => {
    // Create a user to set the treasury fee
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create treasury fee that covers today
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 3); // Start 3 days ago
    
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 3); // End 3 days from now

    await db.insert(treasuryFeesTable)
      .values({
        amount: '25.50',
        week_start: weekStart.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        week_end: weekEnd.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        set_by: user.id
      })
      .execute();

    const result = await getCurrentTreasuryFee();

    expect(result).not.toBeNull();
    expect(result?.amount).toEqual(25.50);
    expect(typeof result?.amount).toBe('number');
    expect(result?.week_start).toBeInstanceOf(Date);
    expect(result?.week_end).toBeInstanceOf(Date);
    expect(result?.set_by).toEqual(user.id);
    expect(result?.id).toBeDefined();
    expect(result?.created_at).toBeInstanceOf(Date);
  });

  it('should return null when treasury fee exists but date is outside range', async () => {
    // Create a user to set the treasury fee
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create treasury fee for last week (outside current date range)
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 14); // Start 14 days ago
    
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - 7); // End 7 days ago

    await db.insert(treasuryFeesTable)
      .values({
        amount: '20.00',
        week_start: weekStart.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        week_end: weekEnd.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        set_by: user.id
      })
      .execute();

    const result = await getCurrentTreasuryFee();
    expect(result).toBeNull();
  });

  it('should return most recent treasury fee when multiple overlapping fees exist', async () => {
    // Create a user to set the treasury fee
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create date range that covers today
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 3);
    
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 3);

    // Create first treasury fee
    await db.insert(treasuryFeesTable)
      .values({
        amount: '15.00',
        week_start: weekStart.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        week_end: weekEnd.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        set_by: user.id
      })
      .execute();

    // Wait a moment to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second treasury fee (more recent)
    await db.insert(treasuryFeesTable)
      .values({
        amount: '30.00',
        week_start: weekStart.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        week_end: weekEnd.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        set_by: user.id
      })
      .execute();

    const result = await getCurrentTreasuryFee();

    expect(result).not.toBeNull();
    expect(result?.amount).toEqual(30.00); // Should return the more recent fee
  });

  it('should handle edge case where today is exactly the start date', async () => {
    // Create a user to set the treasury fee
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    await db.insert(treasuryFeesTable)
      .values({
        amount: '12.75',
        week_start: today.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        week_end: weekEnd.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        set_by: user.id
      })
      .execute();

    const result = await getCurrentTreasuryFee();

    expect(result).not.toBeNull();
    expect(result?.amount).toEqual(12.75);
  });

  it('should handle edge case where today is exactly the end date', async () => {
    // Create a user to set the treasury fee
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    await db.insert(treasuryFeesTable)
      .values({
        amount: '18.25',
        week_start: weekStart.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        week_end: today.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        set_by: user.id
      })
      .execute();

    const result = await getCurrentTreasuryFee();

    expect(result).not.toBeNull();
    expect(result?.amount).toEqual(18.25);
  });
});