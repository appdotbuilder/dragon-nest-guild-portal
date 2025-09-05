import { db } from '../db';
import { guidesTable, usersTable } from '../db/schema';
import { type CreateGuideInput, type Guide } from '../schema';
import { eq } from 'drizzle-orm';

export const createGuide = async (input: CreateGuideInput): Promise<Guide> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.created_by} does not exist`);
    }

    // Insert the guide record
    const result = await db.insert(guidesTable)
      .values({
        title: input.title,
        content: input.content,
        created_by: input.created_by,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Guide creation failed:', error);
    throw error;
  }
};