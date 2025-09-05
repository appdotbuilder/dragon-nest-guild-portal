import { db } from '../db';
import { charactersTable, usersTable } from '../db/schema';
import { type CreateCharacterInput, type Character } from '../schema';
import { eq } from 'drizzle-orm';

export const createCharacter = async (input: CreateCharacterInput): Promise<Character> => {
  try {
    // Verify that the user exists first to prevent foreign key constraint violation
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert character record
    const result = await db.insert(charactersTable)
      .values({
        user_id: input.user_id,
        ign: input.ign,
        job: input.job,
        stats_screenshot_url: input.stats_screenshot_url
      })
      .returning()
      .execute();

    const character = result[0];
    return {
      ...character
    };
  } catch (error) {
    console.error('Character creation failed:', error);
    throw error;
  }
};