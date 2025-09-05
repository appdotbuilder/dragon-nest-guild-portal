import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, treasuryFeesTable, treasuryPaymentsTable } from '../db/schema';
import { type SubmitTreasuryPaymentInput } from '../schema';
import { submitTreasuryPayment } from '../handlers/submit_treasury_payment';
import { eq } from 'drizzle-orm';

describe('submitTreasuryPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should submit treasury payment', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test treasury fee
    const treasuryFeeResult = await db.insert(treasuryFeesTable)
      .values({
        amount: '100.50',
        week_start: '2024-01-01',
        week_end: '2024-01-07',
        set_by: user.id
      })
      .returning()
      .execute();
    const treasuryFee = treasuryFeeResult[0];

    const testInput: SubmitTreasuryPaymentInput = {
      user_id: user.id,
      treasury_fee_id: treasuryFee.id,
      proof_url: 'https://cloudinary.example.com/payment-proof.jpg'
    };

    const result = await submitTreasuryPayment(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.treasury_fee_id).toEqual(treasuryFee.id);
    expect(result.proof_url).toEqual(testInput.proof_url);
    expect(result.id).toBeDefined();
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.verified_by).toBeNull();
    expect(result.verified_at).toBeNull();
  });

  it('should save treasury payment to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test treasury fee
    const treasuryFeeResult = await db.insert(treasuryFeesTable)
      .values({
        amount: '75.25',
        week_start: '2024-02-01',
        week_end: '2024-02-07',
        set_by: user.id
      })
      .returning()
      .execute();
    const treasuryFee = treasuryFeeResult[0];

    const testInput: SubmitTreasuryPaymentInput = {
      user_id: user.id,
      treasury_fee_id: treasuryFee.id,
      proof_url: 'https://cloudinary.example.com/proof-image.png'
    };

    const result = await submitTreasuryPayment(testInput);

    // Query database to verify record was saved
    const payments = await db.select()
      .from(treasuryPaymentsTable)
      .where(eq(treasuryPaymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].user_id).toEqual(user.id);
    expect(payments[0].treasury_fee_id).toEqual(treasuryFee.id);
    expect(payments[0].proof_url).toEqual(testInput.proof_url);
    expect(payments[0].submitted_at).toBeInstanceOf(Date);
    expect(payments[0].verified_by).toBeNull();
    expect(payments[0].verified_at).toBeNull();
  });

  it('should handle multiple payments for same treasury fee', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        discord_id: '111111111',
        discord_username: 'user1',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        discord_id: '222222222',
        discord_username: 'user2',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create test treasury fee
    const treasuryFeeResult = await db.insert(treasuryFeesTable)
      .values({
        amount: '50.00',
        week_start: '2024-03-01',
        week_end: '2024-03-07',
        set_by: user1.id
      })
      .returning()
      .execute();
    const treasuryFee = treasuryFeeResult[0];

    // Submit payments from both users
    const payment1Input: SubmitTreasuryPaymentInput = {
      user_id: user1.id,
      treasury_fee_id: treasuryFee.id,
      proof_url: 'https://cloudinary.example.com/user1-proof.jpg'
    };

    const payment2Input: SubmitTreasuryPaymentInput = {
      user_id: user2.id,
      treasury_fee_id: treasuryFee.id,
      proof_url: 'https://cloudinary.example.com/user2-proof.jpg'
    };

    const result1 = await submitTreasuryPayment(payment1Input);
    const result2 = await submitTreasuryPayment(payment2Input);

    // Verify both payments were recorded correctly
    expect(result1.user_id).toEqual(user1.id);
    expect(result1.treasury_fee_id).toEqual(treasuryFee.id);
    expect(result1.proof_url).toEqual(payment1Input.proof_url);

    expect(result2.user_id).toEqual(user2.id);
    expect(result2.treasury_fee_id).toEqual(treasuryFee.id);
    expect(result2.proof_url).toEqual(payment2Input.proof_url);

    expect(result1.id).not.toEqual(result2.id);
  });

  it('should throw error for non-existent user', async () => {
    // Create test treasury fee with valid user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const treasuryFeeResult = await db.insert(treasuryFeesTable)
      .values({
        amount: '100.00',
        week_start: '2024-01-01',
        week_end: '2024-01-07',
        set_by: user.id
      })
      .returning()
      .execute();
    const treasuryFee = treasuryFeeResult[0];

    const testInput: SubmitTreasuryPaymentInput = {
      user_id: 99999, // Non-existent user ID
      treasury_fee_id: treasuryFee.id,
      proof_url: 'https://cloudinary.example.com/proof.jpg'
    };

    await expect(submitTreasuryPayment(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error for non-existent treasury fee', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const testInput: SubmitTreasuryPaymentInput = {
      user_id: user.id,
      treasury_fee_id: 99999, // Non-existent treasury fee ID
      proof_url: 'https://cloudinary.example.com/proof.jpg'
    };

    await expect(submitTreasuryPayment(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});