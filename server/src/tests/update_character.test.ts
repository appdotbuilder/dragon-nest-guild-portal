import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { charactersTable, usersTable } from '../db/schema';
import { type UpdateCharacterInput, type CreateUserInput, type CreateCharacterInput } from '../schema';
import { updateCharacter } from '../handlers/update_character';
import { eq } from 'drizzle-orm';

// Test inputs
const testUser: CreateUserInput = {
  discord_id: '123456789',
  discord_username: 'TestUser',
  discord_avatar: 'avatar.png',
  guild_role: 'member'
};

const testCharacter: CreateCharacterInput = {
  user_id: 1,
  ign: 'TestCharacter',
  job: 'gladiator',
  stats_screenshot_url: 'https://example.com/stats.png'
};

describe('updateCharacter', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update character IGN', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({ ...testCharacter, user_id: user[0].id })
      .returning()
      .execute();

    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      ign: 'UpdatedCharacter'
    };

    const result = await updateCharacter(updateInput);

    expect(result.id).toEqual(character[0].id);
    expect(result.ign).toEqual('UpdatedCharacter');
    expect(result.job).toEqual(testCharacter.job);
    expect(result.stats_screenshot_url).toEqual(testCharacter.stats_screenshot_url);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(character[0].updated_at!.getTime());
  });

  it('should update character job', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({ ...testCharacter, user_id: user[0].id })
      .returning()
      .execute();

    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      job: 'moonlord'
    };

    const result = await updateCharacter(updateInput);

    expect(result.id).toEqual(character[0].id);
    expect(result.ign).toEqual(testCharacter.ign);
    expect(result.job).toEqual('moonlord');
    expect(result.stats_screenshot_url).toEqual(testCharacter.stats_screenshot_url);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update stats screenshot URL', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({ ...testCharacter, user_id: user[0].id })
      .returning()
      .execute();

    const newUrl = 'https://example.com/updated-stats.png';
    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      stats_screenshot_url: newUrl
    };

    const result = await updateCharacter(updateInput);

    expect(result.id).toEqual(character[0].id);
    expect(result.ign).toEqual(testCharacter.ign);
    expect(result.job).toEqual(testCharacter.job);
    expect(result.stats_screenshot_url).toEqual(newUrl);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set stats screenshot URL to null', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({ ...testCharacter, user_id: user[0].id })
      .returning()
      .execute();

    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      stats_screenshot_url: null
    };

    const result = await updateCharacter(updateInput);

    expect(result.id).toEqual(character[0].id);
    expect(result.ign).toEqual(testCharacter.ign);
    expect(result.job).toEqual(testCharacter.job);
    expect(result.stats_screenshot_url).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({ ...testCharacter, user_id: user[0].id })
      .returning()
      .execute();

    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      ign: 'MultiUpdateChar',
      job: 'barbarian',
      stats_screenshot_url: 'https://example.com/multi-update.png'
    };

    const result = await updateCharacter(updateInput);

    expect(result.id).toEqual(character[0].id);
    expect(result.ign).toEqual('MultiUpdateChar');
    expect(result.job).toEqual('barbarian');
    expect(result.stats_screenshot_url).toEqual('https://example.com/multi-update.png');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(character[0].updated_at!.getTime());
  });

  it('should save updated character to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({ ...testCharacter, user_id: user[0].id })
      .returning()
      .execute();

    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      ign: 'DatabaseSavedChar',
      job: 'destroyer'
    };

    const result = await updateCharacter(updateInput);

    // Verify data was saved to database
    const characters = await db.select()
      .from(charactersTable)
      .where(eq(charactersTable.id, result.id))
      .execute();

    expect(characters).toHaveLength(1);
    expect(characters[0].ign).toEqual('DatabaseSavedChar');
    expect(characters[0].job).toEqual('destroyer');
    expect(characters[0].updated_at).toBeInstanceOf(Date);
    expect(characters[0].updated_at!.getTime()).toBeGreaterThan(character[0].updated_at!.getTime());
  });

  it('should throw error when character does not exist', async () => {
    const updateInput: UpdateCharacterInput = {
      id: 999999,
      ign: 'NonExistentChar'
    };

    await expect(updateCharacter(updateInput)).rejects.toThrow(/Character with id 999999 not found/i);
  });

  it('should only update specified fields and leave others unchanged', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({ ...testCharacter, user_id: user[0].id })
      .returning()
      .execute();

    // Update only IGN
    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      ign: 'OnlyIgnUpdated'
    };

    const result = await updateCharacter(updateInput);

    expect(result.ign).toEqual('OnlyIgnUpdated');
    expect(result.job).toEqual(testCharacter.job); // Should remain unchanged
    expect(result.stats_screenshot_url).toEqual(testCharacter.stats_screenshot_url); // Should remain unchanged
    expect(result.user_id).toEqual(character[0].user_id); // Should remain unchanged
  });

  it('should handle character with no stats screenshot URL initially', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const characterWithoutStats = {
      ...testCharacter,
      user_id: user[0].id,
      stats_screenshot_url: null
    };

    const character = await db.insert(charactersTable)
      .values(characterWithoutStats)
      .returning()
      .execute();

    const updateInput: UpdateCharacterInput = {
      id: character[0].id,
      stats_screenshot_url: 'https://example.com/new-stats.png'
    };

    const result = await updateCharacter(updateInput);

    expect(result.stats_screenshot_url).toEqual('https://example.com/new-stats.png');
    expect(result.ign).toEqual(testCharacter.ign);
    expect(result.job).toEqual(testCharacter.job);
  });
});