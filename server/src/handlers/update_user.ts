import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Build the update object with only the fields that are provided
    const updateFields: any = {
      updated_at: new Date()
    };

    if (input.guild_role !== undefined) {
      updateFields.guild_role = input.guild_role;
    }

    if (input.treasury_status !== undefined) {
      updateFields.treasury_status = input.treasury_status;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateFields)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    // Check if user was found and updated
    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};