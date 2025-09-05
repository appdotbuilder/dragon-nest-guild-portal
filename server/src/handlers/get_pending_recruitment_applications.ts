import { db } from '../db';
import { recruitmentApplicationsTable } from '../db/schema';
import { type RecruitmentApplication } from '../schema';
import { eq } from 'drizzle-orm';

export const getPendingRecruitmentApplications = async (): Promise<RecruitmentApplication[]> => {
  try {
    // Fetch all pending recruitment applications
    const results = await db.select()
      .from(recruitmentApplicationsTable)
      .where(eq(recruitmentApplicationsTable.status, 'pending'))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch pending recruitment applications:', error);
    throw error;
  }
};