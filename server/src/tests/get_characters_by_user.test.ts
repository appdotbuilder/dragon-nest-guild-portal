import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, charactersTable } from '../db/schema';
import { type GetCharactersByUserInput } from '../schema';
import { getCharactersByUser } from '../handlers/get_characters_by_user';
import { eq } from 'drizzle-orm';

describe('getCharactersByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all characters for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_id',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple characters for the user
    await db.insert(charactersTable)
      .values([
        {
          user_id: userId,
          ign: 'TestCharacter1',
          job: 'gladiator',
          stats_screenshot_url: 'https://example.com/stats1.jpg'
        },
        {
          user_id: userId,
          ign: 'TestCharacter2',
          job: 'saleana',
          stats_screenshot_url: null
        }
      ])
      .execute();

    const input: GetCharactersByUserInput = {
      user_id: userId
    };

    const result = await getCharactersByUser(input);

    expect(result).toHaveLength(2);
    
    // Check first character
    const char1 = result.find(c => c.ign === 'TestCharacter1');
    expect(char1).toBeDefined();
    expect(char1!.user_id).toEqual(userId);
    expect(char1!.job).toEqual('gladiator');
    expect(char1!.stats_screenshot_url).toEqual('https://example.com/stats1.jpg');
    expect(char1!.id).toBeDefined();
    expect(char1!.created_at).toBeInstanceOf(Date);
    expect(char1!.updated_at).toBeInstanceOf(Date);

    // Check second character
    const char2 = result.find(c => c.ign === 'TestCharacter2');
    expect(char2).toBeDefined();
    expect(char2!.user_id).toEqual(userId);
    expect(char2!.job).toEqual('saleana');
    expect(char2!.stats_screenshot_url).toBeNull();
    expect(char2!.id).toBeDefined();
    expect(char2!.created_at).toBeInstanceOf(Date);
    expect(char2!.updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array for user with no characters', async () => {
    // Create test user without characters
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_id',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const input: GetCharactersByUserInput = {
      user_id: userResult[0].id
    };

    const result = await getCharactersByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetCharactersByUserInput = {
      user_id: 99999 // Non-existent user ID
    };

    const result = await getCharactersByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return characters for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_id_1',
        discord_username: 'testuser1',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_id_2',
        discord_username: 'testuser2',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create characters for both users
    await db.insert(charactersTable)
      .values([
        {
          user_id: user1Id,
          ign: 'User1Character1',
          job: 'gladiator',
          stats_screenshot_url: null
        },
        {
          user_id: user1Id,
          ign: 'User1Character2',
          job: 'saleana',
          stats_screenshot_url: null
        },
        {
          user_id: user2Id,
          ign: 'User2Character1',
          job: 'moonlord',
          stats_screenshot_url: null
        }
      ])
      .execute();

    const input: GetCharactersByUserInput = {
      user_id: user1Id
    };

    const result = await getCharactersByUser(input);

    expect(result).toHaveLength(2);
    
    // All returned characters should belong to user1
    result.forEach(character => {
      expect(character.user_id).toEqual(user1Id);
    });

    // Check that we get the correct character names
    const characterNames = result.map(c => c.ign);
    expect(characterNames).toContain('User1Character1');
    expect(characterNames).toContain('User1Character2');
    expect(characterNames).not.toContain('User2Character1');
  });

  it('should handle characters with all different job types', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_id',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create characters with different job types
    await db.insert(charactersTable)
      .values([
        {
          user_id: userId,
          ign: 'WarriorChar',
          job: 'gladiator',
          stats_screenshot_url: null
        },
        {
          user_id: userId,
          ign: 'MageChar',
          job: 'elestra',
          stats_screenshot_url: null
        },
        {
          user_id: userId,
          ign: 'ArcherChar',
          job: 'tempest',
          stats_screenshot_url: null
        }
      ])
      .execute();

    const input: GetCharactersByUserInput = {
      user_id: userId
    };

    const result = await getCharactersByUser(input);

    expect(result).toHaveLength(3);

    // Verify different job types are preserved
    const jobs = result.map(c => c.job);
    expect(jobs).toContain('gladiator');
    expect(jobs).toContain('elestra');
    expect(jobs).toContain('tempest');
  });

  it('should verify characters exist in database after creation', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_id',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create character
    await db.insert(charactersTable)
      .values({
        user_id: userId,
        ign: 'TestCharacter',
        job: 'guardian',
        stats_screenshot_url: 'https://example.com/stats.jpg'
      })
      .execute();

    const input: GetCharactersByUserInput = {
      user_id: userId
    };

    const result = await getCharactersByUser(input);

    expect(result).toHaveLength(1);

    // Verify the character exists in database by querying directly
    const dbCharacters = await db.select()
      .from(charactersTable)
      .where(eq(charactersTable.user_id, userId))
      .execute();

    expect(dbCharacters).toHaveLength(1);
    expect(dbCharacters[0].ign).toEqual('TestCharacter');
    expect(dbCharacters[0].job).toEqual('guardian');
    expect(dbCharacters[0].stats_screenshot_url).toEqual('https://example.com/stats.jpg');

    // Compare handler result with direct database query
    expect(result[0].id).toEqual(dbCharacters[0].id);
    expect(result[0].ign).toEqual(dbCharacters[0].ign);
    expect(result[0].job).toEqual(dbCharacters[0].job);
    expect(result[0].user_id).toEqual(dbCharacters[0].user_id);
  });
});