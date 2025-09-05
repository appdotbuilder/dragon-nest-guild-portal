import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        discord_id: input.discord_id,
        discord_username: input.discord_username,
        discord_avatar: input.discord_avatar,
        guild_role: input.guild_role || 'recruit',
        treasury_status: 'pending' // Default treasury status
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};