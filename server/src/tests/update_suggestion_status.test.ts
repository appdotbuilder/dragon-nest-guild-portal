import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, suggestionsTable } from '../db/schema';
import { type UpdateSuggestionStatusInput } from '../schema';
import { updateSuggestionStatus } from '../handlers/update_suggestion_status';
import { eq } from 'drizzle-orm';

describe('updateSuggestionStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testSuggestionId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create a test suggestion
    const suggestionResult = await db.insert(suggestionsTable)
      .values({
        title: 'Test Suggestion',
        description: 'This is a test suggestion for status updates',
        status: 'pending',
        upvotes: 5,
        downvotes: 2,
        created_by: testUserId
      })
      .returning()
      .execute();

    testSuggestionId = suggestionResult[0].id;
  });

  it('should update suggestion status to approved', async () => {
    const input: UpdateSuggestionStatusInput = {
      suggestion_id: testSuggestionId,
      status: 'approved'
    };

    const result = await updateSuggestionStatus(input);

    expect(result.id).toEqual(testSuggestionId);
    expect(result.status).toEqual('approved');
    expect(result.title).toEqual('Test Suggestion');
    expect(result.description).toEqual('This is a test suggestion for status updates');
    expect(result.upvotes).toEqual(5);
    expect(result.downvotes).toEqual(2);
    expect(result.created_by).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update suggestion status to rejected', async () => {
    const input: UpdateSuggestionStatusInput = {
      suggestion_id: testSuggestionId,
      status: 'rejected'
    };

    const result = await updateSuggestionStatus(input);

    expect(result.status).toEqual('rejected');
    expect(result.id).toEqual(testSuggestionId);
  });

  it('should update suggestion status to implemented', async () => {
    const input: UpdateSuggestionStatusInput = {
      suggestion_id: testSuggestionId,
      status: 'implemented'
    };

    const result = await updateSuggestionStatus(input);

    expect(result.status).toEqual('implemented');
    expect(result.id).toEqual(testSuggestionId);
  });

  it('should save updated status to database', async () => {
    const input: UpdateSuggestionStatusInput = {
      suggestion_id: testSuggestionId,
      status: 'approved'
    };

    await updateSuggestionStatus(input);

    // Verify the status was updated in the database
    const suggestions = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].status).toEqual('approved');
    expect(suggestions[0].updated_at).toBeInstanceOf(Date);
    expect(suggestions[0].id).toEqual(testSuggestionId);
  });

  it('should update the updated_at timestamp', async () => {
    // Get the original timestamp
    const originalSuggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, testSuggestionId))
      .execute();

    const originalUpdatedAt = originalSuggestion[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateSuggestionStatusInput = {
      suggestion_id: testSuggestionId,
      status: 'approved'
    };

    const result = await updateSuggestionStatus(input);

    // Verify updated_at was changed
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent suggestion', async () => {
    const input: UpdateSuggestionStatusInput = {
      suggestion_id: 99999,
      status: 'approved'
    };

    expect(updateSuggestionStatus(input))
      .rejects.toThrow(/suggestion with id 99999 not found/i);
  });

  it('should preserve all other suggestion fields', async () => {
    const input: UpdateSuggestionStatusInput = {
      suggestion_id: testSuggestionId,
      status: 'implemented'
    };

    const result = await updateSuggestionStatus(input);

    // Verify all original fields are preserved
    expect(result.title).toEqual('Test Suggestion');
    expect(result.description).toEqual('This is a test suggestion for status updates');
    expect(result.upvotes).toEqual(5);
    expect(result.downvotes).toEqual(2);
    expect(result.created_by).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Only status and updated_at should have changed
    expect(result.status).toEqual('implemented');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle all valid suggestion status values', async () => {
    const statuses = ['pending', 'approved', 'rejected', 'implemented'] as const;

    for (const status of statuses) {
      const input: UpdateSuggestionStatusInput = {
        suggestion_id: testSuggestionId,
        status: status
      };

      const result = await updateSuggestionStatus(input);
      expect(result.status).toEqual(status);

      // Verify it was saved to database
      const dbSuggestion = await db.select()
        .from(suggestionsTable)
        .where(eq(suggestionsTable.id, testSuggestionId))
        .execute();

      expect(dbSuggestion[0].status).toEqual(status);
    }
  });
});