import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, suggestionsTable, suggestionVotesTable } from '../db/schema';
import { type VoteSuggestionInput } from '../schema';
import { voteSuggestion } from '../handlers/vote_suggestion';
import { eq, and } from 'drizzle-orm';

describe('voteSuggestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testSuggestionId: number;
  let anotherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          discord_id: 'user1',
          discord_username: 'testuser1',
          discord_avatar: null,
          guild_role: 'member'
        },
        {
          discord_id: 'user2', 
          discord_username: 'testuser2',
          discord_avatar: null,
          guild_role: 'member'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    anotherUserId = users[1].id;

    // Create test suggestion
    const suggestions = await db.insert(suggestionsTable)
      .values({
        title: 'Test Suggestion',
        description: 'A suggestion for testing voting',
        created_by: testUserId,
        status: 'pending',
        upvotes: 0,
        downvotes: 0
      })
      .returning()
      .execute();

    testSuggestionId = suggestions[0].id;
  });

  it('should create an upvote for a suggestion', async () => {
    const input: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    };

    const result = await voteSuggestion(input);

    expect(result.suggestion_id).toEqual(testSuggestionId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.vote_type).toEqual('upvote');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a downvote for a suggestion', async () => {
    const input: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'downvote'
    };

    const result = await voteSuggestion(input);

    expect(result.suggestion_id).toEqual(testSuggestionId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.vote_type).toEqual('downvote');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update suggestion upvote count when upvoting', async () => {
    const input: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    };

    await voteSuggestion(input);

    const suggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    expect(suggestion[0].upvotes).toEqual(1);
    expect(suggestion[0].downvotes).toEqual(0);
    expect(suggestion[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update suggestion downvote count when downvoting', async () => {
    const input: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'downvote'
    };

    await voteSuggestion(input);

    const suggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    expect(suggestion[0].upvotes).toEqual(0);
    expect(suggestion[0].downvotes).toEqual(1);
    expect(suggestion[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save vote to database', async () => {
    const input: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    };

    const result = await voteSuggestion(input);

    const votes = await db.select()
      .from(suggestionVotesTable)
      .where(eq(suggestionVotesTable.id, result.id))
      .execute();

    expect(votes).toHaveLength(1);
    expect(votes[0].suggestion_id).toEqual(testSuggestionId);
    expect(votes[0].user_id).toEqual(testUserId);
    expect(votes[0].vote_type).toEqual('upvote');
    expect(votes[0].created_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate votes of same type', async () => {
    const input: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    };

    // First vote should succeed
    await voteSuggestion(input);

    // Second identical vote should fail
    await expect(voteSuggestion(input)).rejects.toThrow(/already upvoted/i);
  });

  it('should allow users to change their vote type', async () => {
    // First vote as upvote
    const upvoteInput: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    };

    await voteSuggestion(upvoteInput);

    // Change to downvote
    const downvoteInput: VoteSuggestionInput = {
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'downvote'
    };

    const result = await voteSuggestion(downvoteInput);

    expect(result.vote_type).toEqual('downvote');
    expect(result.user_id).toEqual(testUserId);
    expect(result.suggestion_id).toEqual(testSuggestionId);

    // Verify vote counts updated correctly
    const suggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    expect(suggestion[0].upvotes).toEqual(0);
    expect(suggestion[0].downvotes).toEqual(1);
  });

  it('should update vote counts correctly when changing vote types', async () => {
    // User 1 upvotes, User 2 downvotes
    await voteSuggestion({
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    });

    await voteSuggestion({
      suggestion_id: testSuggestionId,
      user_id: anotherUserId,
      vote_type: 'downvote'
    });

    // Verify initial counts
    let suggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    expect(suggestion[0].upvotes).toEqual(1);
    expect(suggestion[0].downvotes).toEqual(1);

    // User 1 changes to downvote
    await voteSuggestion({
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'downvote'
    });

    // Verify updated counts
    suggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    expect(suggestion[0].upvotes).toEqual(0);
    expect(suggestion[0].downvotes).toEqual(2);
  });

  it('should only have one vote record per user per suggestion', async () => {
    // Create initial vote
    await voteSuggestion({
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    });

    // Change vote
    await voteSuggestion({
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'downvote'
    });

    // Verify only one vote record exists
    const votes = await db.select()
      .from(suggestionVotesTable)
      .where(
        and(
          eq(suggestionVotesTable.suggestion_id, testSuggestionId),
          eq(suggestionVotesTable.user_id, testUserId)
        )
      )
      .execute();

    expect(votes).toHaveLength(1);
    expect(votes[0].vote_type).toEqual('downvote');
  });

  it('should throw error for non-existent suggestion', async () => {
    const input: VoteSuggestionInput = {
      suggestion_id: 99999,
      user_id: testUserId,
      vote_type: 'upvote'
    };

    await expect(voteSuggestion(input)).rejects.toThrow(/suggestion.*not found/i);
  });

  it('should allow multiple users to vote on same suggestion', async () => {
    // User 1 upvotes
    await voteSuggestion({
      suggestion_id: testSuggestionId,
      user_id: testUserId,
      vote_type: 'upvote'
    });

    // User 2 also upvotes
    await voteSuggestion({
      suggestion_id: testSuggestionId,
      user_id: anotherUserId,
      vote_type: 'upvote'
    });

    // Verify vote counts
    const suggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    expect(suggestion[0].upvotes).toEqual(2);
    expect(suggestion[0].downvotes).toEqual(0);

    // Verify both vote records exist
    const votes = await db.select()
      .from(suggestionVotesTable)
      .where(eq(suggestionVotesTable.suggestion_id, testSuggestionId))
      .execute();

    expect(votes).toHaveLength(2);
  });
});