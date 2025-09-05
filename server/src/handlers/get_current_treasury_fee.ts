import { db } from '../db';
import { treasuryFeesTable } from '../db/schema';
import { type TreasuryFee } from '../schema';
import { and, gte, lte, desc } from 'drizzle-orm';

export const getCurrentTreasuryFee = async (): Promise<TreasuryFee | null> => {
  try {
    // Format today as YYYY-MM-DD string to match date column format
    const today = new Date().toISOString().split('T')[0];

    // Find the treasury fee that covers the current date
    const result = await db.select()
      .from(treasuryFeesTable)
      .where(
        and(
          lte(treasuryFeesTable.week_start, today),
          gte(treasuryFeesTable.week_end, today)
        )
      )
      .orderBy(desc(treasuryFeesTable.created_at))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const fee = result[0];
    return {
      ...fee,
      amount: parseFloat(fee.amount), // Convert numeric field to number
      week_start: new Date(fee.week_start), // Convert date string to Date object
      week_end: new Date(fee.week_end) // Convert date string to Date object
    };
  } catch (error) {
    console.error('Failed to get current treasury fee:', error);
    throw error;
  }
};