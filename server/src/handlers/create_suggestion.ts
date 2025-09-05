import { db } from '../db';
import { suggestionsTable, usersTable } from '../db/schema';
import { type CreateSuggestionInput, type Suggestion } from '../schema';
import { eq } from 'drizzle-orm';

export const createSuggestion = async (input: CreateSuggestionInput): Promise<Suggestion> => {
  try {
    // First, verify that the user exists to prevent foreign key constraint violations
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .limit(1)
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.created_by} does not exist`);
    }

    // Insert suggestion record
    const result = await db.insert(suggestionsTable)
      .values({
        title: input.title,
        description: input.description,
        created_by: input.created_by
      })
      .returning()
      .execute();

    const suggestion = result[0];
    return suggestion;
  } catch (error) {
    console.error('Suggestion creation failed:', error);
    throw error;
  }
};