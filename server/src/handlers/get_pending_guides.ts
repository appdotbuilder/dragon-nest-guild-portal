import { db } from '../db';
import { guidesTable } from '../db/schema';
import { type Guide } from '../schema';
import { eq } from 'drizzle-orm';

export const getPendingGuides = async (): Promise<Guide[]> => {
  try {
    // Query for guides with pending status, ordered by creation date (newest first)
    const results = await db.select()
      .from(guidesTable)
      .where(eq(guidesTable.status, 'pending'))
      .orderBy(guidesTable.created_at)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch pending guides:', error);
    throw error;
  }
};