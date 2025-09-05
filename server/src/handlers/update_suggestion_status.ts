import { db } from '../db';
import { suggestionsTable } from '../db/schema';
import { type UpdateSuggestionStatusInput, type Suggestion } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSuggestionStatus = async (input: UpdateSuggestionStatusInput): Promise<Suggestion> => {
  try {
    // Update the suggestion status and updated_at timestamp
    const result = await db.update(suggestionsTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(suggestionsTable.id, input.suggestion_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Suggestion with id ${input.suggestion_id} not found`);
    }

    // Return the updated suggestion
    const suggestion = result[0];
    return {
      ...suggestion,
      created_at: suggestion.created_at,
      updated_at: suggestion.updated_at
    };
  } catch (error) {
    console.error('Suggestion status update failed:', error);
    throw error;
  }
};