import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { charactersTable, usersTable } from '../db/schema';
import { type CreateCharacterInput } from '../schema';
import { createCharacter } from '../handlers/create_character';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  discord_id: 'test_discord_123',
  discord_username: 'TestUser',
  discord_avatar: 'avatar_url.png',
  guild_role: 'member' as const
};

// Test character input
const testCharacterInput: CreateCharacterInput = {
  user_id: 1, // Will be set dynamically after user creation
  ign: 'TestWarrior',
  job: 'gladiator',
  stats_screenshot_url: 'https://example.com/stats.png'
};

describe('createCharacter', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let createdUserId: number;

  beforeEach(async () => {
    // Create a test user first for foreign key constraint
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    createdUserId = userResult[0].id;
    testCharacterInput.user_id = createdUserId;
  });

  it('should create a character with all fields', async () => {
    const result = await createCharacter(testCharacterInput);

    // Basic field validation
    expect(result.user_id).toEqual(createdUserId);
    expect(result.ign).toEqual('TestWarrior');
    expect(result.job).toEqual('gladiator');
    expect(result.stats_screenshot_url).toEqual('https://example.com/stats.png');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a character with null stats_screenshot_url', async () => {
    const inputWithoutScreenshot: CreateCharacterInput = {
      ...testCharacterInput,
      stats_screenshot_url: null
    };

    const result = await createCharacter(inputWithoutScreenshot);

    expect(result.user_id).toEqual(createdUserId);
    expect(result.ign).toEqual('TestWarrior');
    expect(result.job).toEqual('gladiator');
    expect(result.stats_screenshot_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save character to database', async () => {
    const result = await createCharacter(testCharacterInput);

    // Verify character was saved to database
    const characters = await db.select()
      .from(charactersTable)
      .where(eq(charactersTable.id, result.id))
      .execute();

    expect(characters).toHaveLength(1);
    const savedCharacter = characters[0];
    expect(savedCharacter.user_id).toEqual(createdUserId);
    expect(savedCharacter.ign).toEqual('TestWarrior');
    expect(savedCharacter.job).toEqual('gladiator');
    expect(savedCharacter.stats_screenshot_url).toEqual('https://example.com/stats.png');
    expect(savedCharacter.created_at).toBeInstanceOf(Date);
    expect(savedCharacter.updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple characters for the same user', async () => {
    const firstCharacter = await createCharacter({
      ...testCharacterInput,
      ign: 'FirstCharacter',
      job: 'gladiator'
    });

    const secondCharacter = await createCharacter({
      ...testCharacterInput,
      ign: 'SecondCharacter',
      job: 'moonlord'
    });

    expect(firstCharacter.id).not.toEqual(secondCharacter.id);
    expect(firstCharacter.ign).toEqual('FirstCharacter');
    expect(secondCharacter.ign).toEqual('SecondCharacter');
    expect(firstCharacter.job).toEqual('gladiator');
    expect(secondCharacter.job).toEqual('moonlord');
    
    // Verify both characters exist in database
    const allCharacters = await db.select()
      .from(charactersTable)
      .where(eq(charactersTable.user_id, createdUserId))
      .execute();

    expect(allCharacters).toHaveLength(2);
  });

  it('should create characters with different Dragon Nest jobs', async () => {
    const jobs = ['gladiator', 'saleana', 'sniper', 'guardian', 'shooting_star'] as const;

    for (const job of jobs) {
      const result = await createCharacter({
        ...testCharacterInput,
        ign: `Test${job}`,
        job: job
      });

      expect(result.job).toEqual(job);
      expect(result.ign).toEqual(`Test${job}`);
    }

    // Verify all characters were created
    const allCharacters = await db.select()
      .from(charactersTable)
      .where(eq(charactersTable.user_id, createdUserId))
      .execute();

    expect(allCharacters).toHaveLength(jobs.length);
  });

  it('should throw error when user does not exist', async () => {
    const invalidInput: CreateCharacterInput = {
      ...testCharacterInput,
      user_id: 99999 // Non-existent user ID
    };

    await expect(createCharacter(invalidInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle character creation timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createCharacter(testCharacterInput);
    const afterCreation = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});