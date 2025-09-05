import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guidesTable } from '../db/schema';
import { type CreateUserInput, type CreateGuideInput } from '../schema';
import { getPendingGuides } from '../handlers/get_pending_guides';

// Test input for creating users
const testUser: CreateUserInput = {
  discord_id: '123456789',
  discord_username: 'testuser',
  discord_avatar: 'avatar.png',
  guild_role: 'member'
};

// Test input for creating guides
const testGuide: CreateGuideInput = {
  title: 'Test Guide',
  content: 'This is a test guide with enough content to meet the minimum requirements for a guide.',
  created_by: 1
};

describe('getPendingGuides', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no pending guides exist', async () => {
    const result = await getPendingGuides();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should fetch all pending guides', async () => {
    // Create test user first
    await db.insert(usersTable).values({
      discord_id: testUser.discord_id,
      discord_username: testUser.discord_username,
      discord_avatar: testUser.discord_avatar,
      guild_role: testUser.guild_role
    }).execute();

    // Create multiple guides with pending status
    await db.insert(guidesTable).values([
      {
        title: 'First Pending Guide',
        content: testGuide.content,
        created_by: testGuide.created_by,
        status: 'pending'
      },
      {
        title: 'Second Pending Guide',
        content: testGuide.content,
        created_by: testGuide.created_by,
        status: 'pending'
      }
    ]).execute();

    const result = await getPendingGuides();

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('First Pending Guide');
    expect(result[1].title).toEqual('Second Pending Guide');
    expect(result[0].status).toEqual('pending');
    expect(result[1].status).toEqual('pending');
    expect(result[0].created_by).toEqual(1);
    expect(result[1].created_by).toEqual(1);
  });

  it('should only return guides with pending status', async () => {
    // Create test user first
    await db.insert(usersTable).values({
      discord_id: testUser.discord_id,
      discord_username: testUser.discord_username,
      discord_avatar: testUser.discord_avatar,
      guild_role: testUser.guild_role
    }).execute();

    // Create guides with different statuses
    await db.insert(guidesTable).values([
      {
        title: 'Pending Guide',
        content: testGuide.content,
        created_by: testGuide.created_by,
        status: 'pending'
      },
      {
        title: 'Approved Guide',
        content: testGuide.content,
        created_by: testGuide.created_by,
        status: 'approved',
        approved_by: 1,
        approved_at: new Date()
      },
      {
        title: 'Rejected Guide',
        content: testGuide.content,
        created_by: testGuide.created_by,
        status: 'rejected'
      }
    ]).execute();

    const result = await getPendingGuides();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Pending Guide');
    expect(result[0].status).toEqual('pending');
  });

  it('should return guides ordered by creation date', async () => {
    // Create test user first
    await db.insert(usersTable).values({
      discord_id: testUser.discord_id,
      discord_username: testUser.discord_username,
      discord_avatar: testUser.discord_avatar,
      guild_role: testUser.guild_role
    }).execute();

    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    // Create guides with different creation times
    await db.insert(guidesTable).values([
      {
        title: 'Newer Guide',
        content: testGuide.content,
        created_by: testGuide.created_by,
        status: 'pending',
        created_at: now,
        updated_at: now
      },
      {
        title: 'Older Guide',
        content: testGuide.content,
        created_by: testGuide.created_by,
        status: 'pending',
        created_at: earlier,
        updated_at: earlier
      }
    ]).execute();

    const result = await getPendingGuides();

    expect(result).toHaveLength(2);
    // Should be ordered by creation date (oldest first based on orderBy)
    expect(result[0].title).toEqual('Older Guide');
    expect(result[1].title).toEqual('Newer Guide');
    expect(result[0].created_at < result[1].created_at).toBe(true);
  });

  it('should include all required guide fields', async () => {
    // Create test user first
    await db.insert(usersTable).values({
      discord_id: testUser.discord_id,
      discord_username: testUser.discord_username,
      discord_avatar: testUser.discord_avatar,
      guild_role: testUser.guild_role
    }).execute();

    // Create a pending guide
    await db.insert(guidesTable).values({
      title: testGuide.title,
      content: testGuide.content,
      created_by: testGuide.created_by,
      status: 'pending'
    }).execute();

    const result = await getPendingGuides();

    expect(result).toHaveLength(1);
    const guide = result[0];

    // Check all required fields are present
    expect(guide.id).toBeDefined();
    expect(guide.title).toEqual(testGuide.title);
    expect(guide.content).toEqual(testGuide.content);
    expect(guide.status).toEqual('pending');
    expect(guide.created_by).toEqual(testGuide.created_by);
    expect(guide.approved_by).toBeNull();
    expect(guide.approved_at).toBeNull();
    expect(guide.created_at).toBeInstanceOf(Date);
    expect(guide.updated_at).toBeInstanceOf(Date);
  });
});