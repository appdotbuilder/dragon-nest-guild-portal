import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetUserByDiscordIdInput, type User } from '../schema';

export const getUserByDiscordId = async (input: GetUserByDiscordIdInput): Promise<User | null> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.discord_id, input.discord_id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('Failed to get user by Discord ID:', error);
    throw error;
  }
};