import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suggestionsTable, usersTable } from '../db/schema';
import { type CreateSuggestionInput } from '../schema';
import { createSuggestion } from '../handlers/create_suggestion';
import { eq } from 'drizzle-orm';

describe('createSuggestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789012345678',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    return userResult[0];
  };

  it('should create a suggestion', async () => {
    // Create test user first
    const user = await createTestUser();

    const testInput: CreateSuggestionInput = {
      title: 'Improve Guild Events',
      description: 'We should add more weekly events to increase member participation and engagement within the guild.',
      created_by: user.id
    };

    const result = await createSuggestion(testInput);

    // Basic field validation
    expect(result.title).toEqual('Improve Guild Events');
    expect(result.description).toEqual(testInput.description);
    expect(result.created_by).toEqual(user.id);
    expect(result.status).toEqual('pending');
    expect(result.upvotes).toEqual(0);
    expect(result.downvotes).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save suggestion to database', async () => {
    // Create test user first
    const user = await createTestUser();

    const testInput: CreateSuggestionInput = {
      title: 'Guild Website Enhancement',
      description: 'Add a member directory feature to the guild website so members can find and contact each other easily.',
      created_by: user.id
    };

    const result = await createSuggestion(testInput);

    // Query using proper drizzle syntax
    const suggestions = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, result.id))
      .execute();

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].title).toEqual('Guild Website Enhancement');
    expect(suggestions[0].description).toEqual(testInput.description);
    expect(suggestions[0].created_by).toEqual(user.id);
    expect(suggestions[0].status).toEqual('pending');
    expect(suggestions[0].upvotes).toEqual(0);
    expect(suggestions[0].downvotes).toEqual(0);
    expect(suggestions[0].created_at).toBeInstanceOf(Date);
    expect(suggestions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle long descriptions correctly', async () => {
    // Create test user first
    const user = await createTestUser();

    const longDescription = 'A'.repeat(1000); // Maximum allowed by schema
    const testInput: CreateSuggestionInput = {
      title: 'Complex Guild Improvement',
      description: longDescription,
      created_by: user.id
    };

    const result = await createSuggestion(testInput);

    expect(result.description).toEqual(longDescription);
    expect(result.description.length).toEqual(1000);
    
    // Verify it's saved in database
    const suggestions = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, result.id))
      .execute();

    expect(suggestions[0].description).toEqual(longDescription);
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateSuggestionInput = {
      title: 'Invalid User Suggestion',
      description: 'This should fail because the user does not exist.',
      created_by: 99999 // Non-existent user ID
    };

    await expect(createSuggestion(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should create multiple suggestions for same user', async () => {
    // Create test user first
    const user = await createTestUser();

    const suggestion1: CreateSuggestionInput = {
      title: 'First Suggestion',
      description: 'This is the first suggestion from this user.',
      created_by: user.id
    };

    const suggestion2: CreateSuggestionInput = {
      title: 'Second Suggestion',
      description: 'This is the second suggestion from the same user.',
      created_by: user.id
    };

    const result1 = await createSuggestion(suggestion1);
    const result2 = await createSuggestion(suggestion2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.created_by).toEqual(user.id);
    expect(result2.created_by).toEqual(user.id);
    expect(result1.title).toEqual('First Suggestion');
    expect(result2.title).toEqual('Second Suggestion');

    // Verify both are saved in database
    const suggestions = await db.select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.created_by, user.id))
      .execute();

    expect(suggestions).toHaveLength(2);
  });

  it('should create suggestions with different guild roles', async () => {
    // Create users with different roles
    const memberUser = await db.insert(usersTable)
      .values({
        discord_id: '111111111111111111',
        discord_username: 'member_user',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const recruitUser = await db.insert(usersTable)
      .values({
        discord_id: '222222222222222222',
        discord_username: 'recruit_user',
        discord_avatar: null,
        guild_role: 'recruit'
      })
      .returning()
      .execute();

    const memberSuggestion: CreateSuggestionInput = {
      title: 'Member Suggestion',
      description: 'A suggestion from a member.',
      created_by: memberUser[0].id
    };

    const recruitSuggestion: CreateSuggestionInput = {
      title: 'Recruit Suggestion',
      description: 'A suggestion from a recruit.',
      created_by: recruitUser[0].id
    };

    const memberResult = await createSuggestion(memberSuggestion);
    const recruitResult = await createSuggestion(recruitSuggestion);

    expect(memberResult.created_by).toEqual(memberUser[0].id);
    expect(recruitResult.created_by).toEqual(recruitUser[0].id);
    expect(memberResult.title).toEqual('Member Suggestion');
    expect(recruitResult.title).toEqual('Recruit Suggestion');
  });
});