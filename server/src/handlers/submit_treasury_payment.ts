import { type SubmitTreasuryPaymentInput, type TreasuryPayment } from '../schema';

export const submitTreasuryPayment = async (input: SubmitTreasuryPaymentInput): Promise<TreasuryPayment> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is allowing VGM/SGM to submit proof of treasury payment
    // by uploading image to Cloudinary and storing the URL in database.
    return Promise.resolve({
        id: 0,
        user_id: input.user_id,
        treasury_fee_id: input.treasury_fee_id,
        proof_url: input.proof_url,
        submitted_at: new Date(),
        verified_by: null,
        verified_at: null
    } as TreasuryPayment);
};