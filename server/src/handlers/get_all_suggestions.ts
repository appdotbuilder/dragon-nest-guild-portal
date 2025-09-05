import { db } from '../db';
import { suggestionsTable } from '../db/schema';
import { desc } from 'drizzle-orm';
import { type Suggestion } from '../schema';

export const getAllSuggestions = async (): Promise<Suggestion[]> => {
  try {
    // Fetch all suggestions ordered by creation date (newest first)
    const results = await db.select()
      .from(suggestionsTable)
      .orderBy(desc(suggestionsTable.created_at))
      .execute();

    // Return with proper type conversion
    return results.map(suggestion => ({
      ...suggestion,
      // Ensure created_at and updated_at are Date objects
      created_at: new Date(suggestion.created_at),
      updated_at: new Date(suggestion.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch suggestions:', error);
    throw error;
  }
};