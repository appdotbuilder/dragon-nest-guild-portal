import { db } from '../db';
import { guidesTable } from '../db/schema';
import { type Guide } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getApprovedGuides = async (): Promise<Guide[]> => {
  try {
    // Fetch all approved guides ordered by creation date (newest first)
    const results = await db.select()
      .from(guidesTable)
      .where(eq(guidesTable.status, 'approved'))
      .orderBy(desc(guidesTable.created_at))
      .execute();

    // Return the guides (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch approved guides:', error);
    throw error;
  }
};