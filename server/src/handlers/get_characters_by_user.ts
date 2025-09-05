import { db } from '../db';
import { charactersTable } from '../db/schema';
import { type GetCharactersByUserInput, type Character } from '../schema';
import { eq } from 'drizzle-orm';

export const getCharactersByUser = async (input: GetCharactersByUserInput): Promise<Character[]> => {
  try {
    // Query characters by user_id
    const results = await db.select()
      .from(charactersTable)
      .where(eq(charactersTable.user_id, input.user_id))
      .execute();

    // Return characters with proper type conversion for dates
    return results.map(character => ({
      ...character,
      created_at: character.created_at,
      updated_at: character.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch characters by user:', error);
    throw error;
  }
};