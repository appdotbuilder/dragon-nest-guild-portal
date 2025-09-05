import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all users:', error);
    throw error;
  }
};