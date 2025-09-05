import { db } from '../db';
import { guidesTable } from '../db/schema';
import { type ReviewGuideInput, type Guide } from '../schema';
import { eq } from 'drizzle-orm';

export const reviewGuide = async (input: ReviewGuideInput): Promise<Guide> => {
  try {
    // First verify the guide exists
    const existingGuide = await db.select()
      .from(guidesTable)
      .where(eq(guidesTable.id, input.guide_id))
      .execute();

    if (existingGuide.length === 0) {
      throw new Error('Guide not found');
    }

    // Update guide with review status and reviewer info
    const updateData = {
      status: input.status,
      approved_by: input.approved_by,
      approved_at: input.status === 'approved' ? new Date() : null,
      updated_at: new Date()
    };

    const result = await db.update(guidesTable)
      .set(updateData)
      .where(eq(guidesTable.id, input.guide_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update guide');
    }

    return result[0];
  } catch (error) {
    console.error('Guide review failed:', error);
    throw error;
  }
};