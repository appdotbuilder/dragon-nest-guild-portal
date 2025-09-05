import { db } from '../db';
import { suggestionsTable, suggestionVotesTable } from '../db/schema';
import { type VoteSuggestionInput, type SuggestionVote } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const voteSuggestion = async (input: VoteSuggestionInput): Promise<SuggestionVote> => {
  try {
    return await db.transaction(async (tx) => {
      // Check if suggestion exists
      const suggestion = await tx.select()
        .from(suggestionsTable)
        .where(eq(suggestionsTable.id, input.suggestion_id))
        .execute();
      
      if (suggestion.length === 0) {
        throw new Error(`Suggestion with ID ${input.suggestion_id} not found`);
      }

      // Check if user already voted on this suggestion
      const existingVote = await tx.select()
        .from(suggestionVotesTable)
        .where(
          and(
            eq(suggestionVotesTable.suggestion_id, input.suggestion_id),
            eq(suggestionVotesTable.user_id, input.user_id)
          )
        )
        .execute();

      let voteRecord: SuggestionVote;
      let voteChange = 0;
      let oppositeVoteChange = 0;

      if (existingVote.length > 0) {
        const currentVote = existingVote[0];
        
        if (currentVote.vote_type === input.vote_type) {
          throw new Error(`User has already ${input.vote_type}d this suggestion`);
        }

        // User is changing their vote - update existing record
        const updatedVote = await tx.update(suggestionVotesTable)
          .set({ 
            vote_type: input.vote_type,
            created_at: new Date()
          })
          .where(eq(suggestionVotesTable.id, currentVote.id))
          .returning()
          .execute();

        voteRecord = updatedVote[0];

        // Calculate vote count changes for switching votes
        if (input.vote_type === 'upvote') {
          voteChange = 1; // Add one upvote
          oppositeVoteChange = -1; // Remove one downvote
        } else {
          voteChange = 1; // Add one downvote
          oppositeVoteChange = -1; // Remove one upvote
        }
      } else {
        // Create new vote record
        const newVote = await tx.insert(suggestionVotesTable)
          .values({
            suggestion_id: input.suggestion_id,
            user_id: input.user_id,
            vote_type: input.vote_type
          })
          .returning()
          .execute();

        voteRecord = newVote[0];
        voteChange = 1; // Add one vote of the specified type
      }

      // Update suggestion vote counts
      if (input.vote_type === 'upvote') {
        await tx.update(suggestionsTable)
          .set({
            upvotes: sql`${suggestionsTable.upvotes} + ${voteChange}`,
            downvotes: existingVote.length > 0 
              ? sql`${suggestionsTable.downvotes} + ${oppositeVoteChange}`
              : suggestionsTable.downvotes,
            updated_at: new Date()
          })
          .where(eq(suggestionsTable.id, input.suggestion_id))
          .execute();
      } else {
        await tx.update(suggestionsTable)
          .set({
            downvotes: sql`${suggestionsTable.downvotes} + ${voteChange}`,
            upvotes: existingVote.length > 0 
              ? sql`${suggestionsTable.upvotes} + ${oppositeVoteChange}`
              : suggestionsTable.upvotes,
            updated_at: new Date()
          })
          .where(eq(suggestionsTable.id, input.suggestion_id))
          .execute();
      }

      return voteRecord;
    });
  } catch (error) {
    console.error('Vote suggestion failed:', error);
    throw error;
  }
};