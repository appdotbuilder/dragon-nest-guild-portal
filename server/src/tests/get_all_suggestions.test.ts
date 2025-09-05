import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, suggestionsTable } from '../db/schema';
import { getAllSuggestions } from '../handlers/get_all_suggestions';
import { eq } from 'drizzle-orm';

describe('getAllSuggestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no suggestions exist', async () => {
    const result = await getAllSuggestions();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all suggestions ordered by creation date', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'TestUser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test suggestions with different timestamps
    const firstSuggestion = await db.insert(suggestionsTable)
      .values({
        title: 'First Suggestion',
        description: 'This was created first',
        created_by: userId,
        status: 'pending',
        upvotes: 5,
        downvotes: 2
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondSuggestion = await db.insert(suggestionsTable)
      .values({
        title: 'Second Suggestion',
        description: 'This was created second',
        created_by: userId,
        status: 'approved',
        upvotes: 10,
        downvotes: 1
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const thirdSuggestion = await db.insert(suggestionsTable)
      .values({
        title: 'Third Suggestion',
        description: 'This was created third',
        created_by: userId,
        status: 'rejected',
        upvotes: 3,
        downvotes: 7
      })
      .returning()
      .execute();

    const result = await getAllSuggestions();

    // Should return 3 suggestions
    expect(result).toHaveLength(3);

    // Should be ordered by creation date (newest first)
    expect(result[0].title).toEqual('Third Suggestion');
    expect(result[1].title).toEqual('Second Suggestion');
    expect(result[2].title).toEqual('First Suggestion');

    // Verify all fields are properly returned
    expect(result[0].id).toEqual(thirdSuggestion[0].id);
    expect(result[0].description).toEqual('This was created third');
    expect(result[0].status).toEqual('rejected');
    expect(result[0].upvotes).toEqual(3);
    expect(result[0].downvotes).toEqual(7);
    expect(result[0].created_by).toEqual(userId);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return suggestions with different statuses', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '987654321',
        discord_username: 'StatusTestUser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create suggestions with all possible statuses
    const suggestions = [
      {
        title: 'Pending Suggestion',
        description: 'A pending suggestion',
        status: 'pending' as const,
        upvotes: 0,
        downvotes: 0
      },
      {
        title: 'Approved Suggestion',
        description: 'An approved suggestion',
        status: 'approved' as const,
        upvotes: 15,
        downvotes: 3
      },
      {
        title: 'Rejected Suggestion',
        description: 'A rejected suggestion',
        status: 'rejected' as const,
        upvotes: 2,
        downvotes: 12
      },
      {
        title: 'Implemented Suggestion',
        description: 'An implemented suggestion',
        status: 'implemented' as const,
        upvotes: 25,
        downvotes: 1
      }
    ];

    // Insert all suggestions
    for (const suggestion of suggestions) {
      await db.insert(suggestionsTable)
        .values({
          ...suggestion,
          created_by: userId
        })
        .execute();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    const result = await getAllSuggestions();

    expect(result).toHaveLength(4);

    // Check that all statuses are present
    const statuses = result.map(s => s.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('approved');
    expect(statuses).toContain('rejected');
    expect(statuses).toContain('implemented');

    // Verify vote counts are preserved
    const implementedSuggestion = result.find(s => s.status === 'implemented');
    expect(implementedSuggestion?.upvotes).toEqual(25);
    expect(implementedSuggestion?.downvotes).toEqual(1);
  });

  it('should handle suggestions with null/zero vote counts', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '111111111',
        discord_username: 'VoteTestUser',
        discord_avatar: null,
        guild_role: 'recruit'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create suggestion with default vote counts (0)
    await db.insert(suggestionsTable)
      .values({
        title: 'Zero Votes Suggestion',
        description: 'A suggestion with no votes',
        created_by: userId,
        status: 'pending'
        // upvotes and downvotes will default to 0
      })
      .execute();

    const result = await getAllSuggestions();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Zero Votes Suggestion');
    expect(result[0].upvotes).toEqual(0);
    expect(result[0].downvotes).toEqual(0);
    expect(result[0].status).toEqual('pending');
  });

  it('should verify suggestions are saved to database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '222222222',
        discord_username: 'DatabaseTestUser',
        discord_avatar: null,
        guild_role: 'senior_guild_member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a suggestion
    const insertResult = await db.insert(suggestionsTable)
      .values({
        title: 'Database Test Suggestion',
        description: 'Testing database persistence',
        created_by: userId,
        status: 'pending',
        upvotes: 8,
        downvotes: 3
      })
      .returning()
      .execute();

    const suggestionId = insertResult[0].id;

    // Fetch all suggestions using the handler
    const result = await getAllSuggestions();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(suggestionId);

    // Verify data matches what was inserted
    const dbSuggestion = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, suggestionId))
      .execute();

    expect(dbSuggestion).toHaveLength(1);
    expect(dbSuggestion[0].title).toEqual('Database Test Suggestion');
    expect(dbSuggestion[0].upvotes).toEqual(8);
    expect(dbSuggestion[0].downvotes).toEqual(3);
    expect(dbSuggestion[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle large number of suggestions efficiently', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '333333333',
        discord_username: 'BulkTestUser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple suggestions
    const suggestions = [];
    for (let i = 1; i <= 20; i++) {
      suggestions.push({
        title: `Suggestion ${i}`,
        description: `Description for suggestion number ${i}`,
        created_by: userId,
        status: (i % 4 === 0 ? 'approved' : 
                 i % 3 === 0 ? 'rejected' :
                 i % 2 === 0 ? 'implemented' : 'pending') as any,
        upvotes: i * 2,
        downvotes: Math.floor(i / 2)
      });
    }

    // Insert all suggestions
    for (const suggestion of suggestions) {
      await db.insert(suggestionsTable)
        .values(suggestion)
        .execute();
    }

    const result = await getAllSuggestions();

    expect(result).toHaveLength(20);
    
    // Verify ordering (newest first, so last inserted should be first)
    expect(result[0].title).toEqual('Suggestion 20');
    expect(result[19].title).toEqual('Suggestion 1');

    // Verify all suggestions have proper date objects
    result.forEach(suggestion => {
      expect(suggestion.created_at).toBeInstanceOf(Date);
      expect(suggestion.updated_at).toBeInstanceOf(Date);
      expect(typeof suggestion.upvotes).toBe('number');
      expect(typeof suggestion.downvotes).toBe('number');
    });
  });
});