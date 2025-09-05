import { db } from '../db';
import { treasuryFeesTable, usersTable } from '../db/schema';
import { type CreateTreasuryFeeInput, type TreasuryFee } from '../schema';
import { eq } from 'drizzle-orm';

export const createTreasuryFee = async (input: CreateTreasuryFeeInput): Promise<TreasuryFee> => {
  try {
    // Verify that the user setting the fee exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.set_by))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Insert treasury fee record
    const result = await db.insert(treasuryFeesTable)
      .values({
        amount: input.amount.toString(), // Convert number to string for numeric column
        week_start: input.week_start.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        week_end: input.week_end.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        set_by: input.set_by
      })
      .returning()
      .execute();

    // Convert fields back to proper types before returning
    const treasuryFee = result[0];
    return {
      ...treasuryFee,
      amount: parseFloat(treasuryFee.amount), // Convert string back to number
      week_start: new Date(treasuryFee.week_start), // Convert string back to Date
      week_end: new Date(treasuryFee.week_end) // Convert string back to Date
    };
  } catch (error) {
    console.error('Treasury fee creation failed:', error);
    throw error;
  }
};