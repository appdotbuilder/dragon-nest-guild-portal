import { db } from '../db';
import { charactersTable } from '../db/schema';
import { type UpdateCharacterInput, type Character } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCharacter = async (input: UpdateCharacterInput): Promise<Character> => {
  try {
    // Build the update values object with only the fields that were provided
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.ign !== undefined) {
      updateValues.ign = input.ign;
    }

    if (input.job !== undefined) {
      updateValues.job = input.job;
    }

    if (input.stats_screenshot_url !== undefined) {
      updateValues.stats_screenshot_url = input.stats_screenshot_url;
    }

    // Update the character record
    const result = await db.update(charactersTable)
      .set(updateValues)
      .where(eq(charactersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Character with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Character update failed:', error);
    throw error;
  }
};