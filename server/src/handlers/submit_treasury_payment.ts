import { db } from '../db';
import { treasuryPaymentsTable } from '../db/schema';
import { type SubmitTreasuryPaymentInput, type TreasuryPayment } from '../schema';

export const submitTreasuryPayment = async (input: SubmitTreasuryPaymentInput): Promise<TreasuryPayment> => {
  try {
    // Insert treasury payment record
    const result = await db.insert(treasuryPaymentsTable)
      .values({
        user_id: input.user_id,
        treasury_fee_id: input.treasury_fee_id,
        proof_url: input.proof_url
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Treasury payment submission failed:', error);
    throw error;
  }
};