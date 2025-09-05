import { db } from '../db';
import { recruitmentApplicationsTable, usersTable } from '../db/schema';
import { type CreateRecruitmentApplicationInput, type RecruitmentApplication } from '../schema';
import { eq } from 'drizzle-orm';

export const createRecruitmentApplication = async (input: CreateRecruitmentApplicationInput): Promise<RecruitmentApplication> => {
  try {
    // Verify that the user exists first to prevent foreign key constraint errors
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert recruitment application record
    const result = await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: input.user_id,
        application_text: input.application_text,
        status: 'pending' // Default status from schema
      })
      .returning()
      .execute();

    const application = result[0];
    return {
      id: application.id,
      user_id: application.user_id,
      application_text: application.application_text,
      status: application.status,
      reviewed_by: application.reviewed_by,
      reviewed_at: application.reviewed_at,
      created_at: application.created_at
    };
  } catch (error) {
    console.error('Recruitment application creation failed:', error);
    throw error;
  }
};