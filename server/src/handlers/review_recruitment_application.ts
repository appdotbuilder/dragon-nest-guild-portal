import { db } from '../db';
import { recruitmentApplicationsTable, usersTable } from '../db/schema';
import { type ReviewRecruitmentApplicationInput, type RecruitmentApplication } from '../schema';
import { eq } from 'drizzle-orm';

export const reviewRecruitmentApplication = async (input: ReviewRecruitmentApplicationInput): Promise<RecruitmentApplication> => {
  try {
    // First, verify the application exists and is in pending status
    const existingApplications = await db.select()
      .from(recruitmentApplicationsTable)
      .where(eq(recruitmentApplicationsTable.id, input.application_id))
      .execute();

    if (existingApplications.length === 0) {
      throw new Error('Recruitment application not found');
    }

    const existingApplication = existingApplications[0];
    
    if (existingApplication.status !== 'pending') {
      throw new Error('Application has already been reviewed');
    }

    // Verify the reviewer exists
    const reviewers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.reviewed_by))
      .execute();

    if (reviewers.length === 0) {
      throw new Error('Reviewer not found');
    }

    // Update the application status
    const updatedApplications = await db.update(recruitmentApplicationsTable)
      .set({
        status: input.status,
        reviewed_by: input.reviewed_by,
        reviewed_at: new Date()
      })
      .where(eq(recruitmentApplicationsTable.id, input.application_id))
      .returning()
      .execute();

    const updatedApplication = updatedApplications[0];

    // If approved, promote the user from 'recruit' to 'member' role
    if (input.status === 'approved') {
      await db.update(usersTable)
        .set({
          guild_role: 'member',
          updated_at: new Date()
        })
        .where(eq(usersTable.id, updatedApplication.user_id))
        .execute();
    }

    return updatedApplication;
  } catch (error) {
    console.error('Review recruitment application failed:', error);
    throw error;
  }
};