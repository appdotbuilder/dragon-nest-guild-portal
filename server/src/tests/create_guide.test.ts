import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { guidesTable, usersTable } from '../db/schema';
import { type CreateGuideInput } from '../schema';
import { createGuide } from '../handlers/create_guide';
import { eq } from 'drizzle-orm';

describe('createGuide', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a guide with pending status', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'TestUser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateGuideInput = {
      title: 'Ultimate Dragon Nest Guide',
      content: 'This is a comprehensive guide on how to play Dragon Nest effectively. It covers all the basics from character creation to endgame content. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      created_by: testUser.id
    };

    const result = await createGuide(testInput);

    // Basic field validation
    expect(result.title).toEqual('Ultimate Dragon Nest Guide');
    expect(result.content).toEqual(testInput.content);
    expect(result.created_by).toEqual(testUser.id);
    expect(result.status).toEqual('pending');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save guide to database correctly', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test456',
        discord_username: 'GuideAuthor',
        discord_avatar: null,
        guild_role: 'senior_guild_member'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateGuideInput = {
      title: 'PvP Strategy Guide',
      content: 'Master the art of PvP combat in Dragon Nest with these advanced strategies and techniques. Learn about combo chains, positioning, and timing. This guide will help you dominate the arena.',
      created_by: testUser.id
    };

    const result = await createGuide(testInput);

    // Query the database to verify the guide was saved
    const guides = await db.select()
      .from(guidesTable)
      .where(eq(guidesTable.id, result.id))
      .execute();

    expect(guides).toHaveLength(1);
    expect(guides[0].title).toEqual('PvP Strategy Guide');
    expect(guides[0].content).toEqual(testInput.content);
    expect(guides[0].created_by).toEqual(testUser.id);
    expect(guides[0].status).toEqual('pending');
    expect(guides[0].approved_by).toBeNull();
    expect(guides[0].approved_at).toBeNull();
    expect(guides[0].created_at).toBeInstanceOf(Date);
    expect(guides[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateGuideInput = {
      title: 'Non-existent User Guide',
      content: 'This guide is being created by a user that does not exist in the database. This should fail validation and throw an appropriate error.',
      created_by: 99999 // Non-existent user ID
    };

    expect(createGuide(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should handle multiple guides from same user', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'prolificauthor',
        discord_username: 'ProlificAuthor',
        discord_avatar: null,
        guild_role: 'vice_guild_master'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create first guide
    const firstGuide: CreateGuideInput = {
      title: 'Beginner Guide to Dragon Nest',
      content: 'This guide covers the basics for new players joining Dragon Nest. Learn about character classes, basic combat mechanics, and getting started tips.',
      created_by: testUser.id
    };

    // Create second guide  
    const secondGuide: CreateGuideInput = {
      title: 'Advanced Dungeon Strategies',
      content: 'Advanced tactics for clearing the most difficult dungeons in Dragon Nest. Covers team composition, boss mechanics, and optimization strategies.',
      created_by: testUser.id
    };

    const result1 = await createGuide(firstGuide);
    const result2 = await createGuide(secondGuide);

    // Verify both guides were created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Beginner Guide to Dragon Nest');
    expect(result2.title).toEqual('Advanced Dungeon Strategies');
    expect(result1.created_by).toEqual(testUser.id);
    expect(result2.created_by).toEqual(testUser.id);
    expect(result1.status).toEqual('pending');
    expect(result2.status).toEqual('pending');

    // Verify both exist in database
    const allGuides = await db.select()
      .from(guidesTable)
      .where(eq(guidesTable.created_by, testUser.id))
      .execute();

    expect(allGuides).toHaveLength(2);
  });

  it('should handle guides with minimum content length', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'minimalwriter',
        discord_username: 'MinimalWriter',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create guide with exactly minimum content (100 characters as per schema)
    const minimalContent = 'A'.repeat(100); // Exactly 100 characters
    const testInput: CreateGuideInput = {
      title: 'Short Guide',
      content: minimalContent,
      created_by: testUser.id
    };

    const result = await createGuide(testInput);

    expect(result.content).toEqual(minimalContent);
    expect(result.content.length).toEqual(100);
    expect(result.title).toEqual('Short Guide');
    expect(result.status).toEqual('pending');
  });
});