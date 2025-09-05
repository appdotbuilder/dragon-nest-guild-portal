import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guidesTable } from '../db/schema';
import { getApprovedGuides } from '../handlers/get_approved_guides';

describe('getApprovedGuides', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no approved guides exist', async () => {
    const result = await getApprovedGuides();
    expect(result).toEqual([]);
  });

  it('should return only approved guides', async () => {
    // Create a test user first (required for foreign key)
    const [user] = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    // Create guides with different statuses
    const testGuides = [
      {
        title: 'Approved Guide 1',
        content: 'This is an approved guide content with enough text to meet minimum requirements for testing purposes.',
        status: 'approved' as const,
        created_by: user.id,
        approved_by: user.id,
        approved_at: new Date()
      },
      {
        title: 'Pending Guide',
        content: 'This is a pending guide content with enough text to meet minimum requirements for testing purposes.',
        status: 'pending' as const,
        created_by: user.id,
        approved_by: null,
        approved_at: null
      },
      {
        title: 'Approved Guide 2',
        content: 'This is another approved guide content with enough text to meet minimum requirements for testing purposes.',
        status: 'approved' as const,
        created_by: user.id,
        approved_by: user.id,
        approved_at: new Date()
      },
      {
        title: 'Rejected Guide',
        content: 'This is a rejected guide content with enough text to meet minimum requirements for testing purposes.',
        status: 'rejected' as const,
        created_by: user.id,
        approved_by: user.id,
        approved_at: null
      }
    ];

    await db.insert(guidesTable)
      .values(testGuides)
      .execute();

    const result = await getApprovedGuides();

    // Should only return the 2 approved guides
    expect(result).toHaveLength(2);
    expect(result.every(guide => guide.status === 'approved')).toBe(true);
    
    // Verify guide properties
    const guideTitles = result.map(guide => guide.title);
    expect(guideTitles).toContain('Approved Guide 1');
    expect(guideTitles).toContain('Approved Guide 2');
    expect(guideTitles).not.toContain('Pending Guide');
    expect(guideTitles).not.toContain('Rejected Guide');
  });

  it('should return guides ordered by creation date (newest first)', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        discord_id: 'test456',
        discord_username: 'testuser2',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    // Create guides with different creation times
    const baseDate = new Date('2024-01-01T00:00:00Z');
    const olderDate = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000); // 1 day earlier
    const newerDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // 1 day later

    // Insert in non-chronological order to test ordering
    await db.insert(guidesTable)
      .values({
        title: 'Middle Guide',
        content: 'This is the middle guide content with enough text to meet minimum requirements for testing purposes.',
        status: 'approved',
        created_by: user.id,
        approved_by: user.id,
        approved_at: baseDate,
        created_at: baseDate,
        updated_at: baseDate
      })
      .execute();

    await db.insert(guidesTable)
      .values({
        title: 'Newest Guide',
        content: 'This is the newest guide content with enough text to meet minimum requirements for testing purposes.',
        status: 'approved',
        created_by: user.id,
        approved_by: user.id,
        approved_at: newerDate,
        created_at: newerDate,
        updated_at: newerDate
      })
      .execute();

    await db.insert(guidesTable)
      .values({
        title: 'Oldest Guide',
        content: 'This is the oldest guide content with enough text to meet minimum requirements for testing purposes.',
        status: 'approved',
        created_by: user.id,
        approved_by: user.id,
        approved_at: olderDate,
        created_at: olderDate,
        updated_at: olderDate
      })
      .execute();

    const result = await getApprovedGuides();

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Newest Guide');
    expect(result[1].title).toBe('Middle Guide');
    expect(result[2].title).toBe('Oldest Guide');

    // Verify the ordering by checking created_at timestamps
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }
  });

  it('should return guides with all expected properties', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        discord_id: 'test789',
        discord_username: 'testuser3',
        discord_avatar: 'avatar.png',
        guild_role: 'guild_master',
        treasury_status: 'exempt'
      })
      .returning()
      .execute();

    const testGuide = {
      title: 'Complete Guide Test',
      content: 'This is a comprehensive guide content with enough text to meet minimum requirements for testing all properties.',
      status: 'approved' as const,
      created_by: user.id,
      approved_by: user.id,
      approved_at: new Date()
    };

    await db.insert(guidesTable)
      .values(testGuide)
      .execute();

    const result = await getApprovedGuides();

    expect(result).toHaveLength(1);
    const guide = result[0];

    // Verify all expected properties exist
    expect(guide.id).toBeDefined();
    expect(guide.title).toBe('Complete Guide Test');
    expect(guide.content).toBe(testGuide.content);
    expect(guide.status).toBe('approved');
    expect(guide.created_by).toBe(user.id);
    expect(guide.approved_by).toBe(user.id);
    expect(guide.approved_at).toBeInstanceOf(Date);
    expect(guide.created_at).toBeInstanceOf(Date);
    expect(guide.updated_at).toBeInstanceOf(Date);
  });

  it('should handle large number of approved guides', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        discord_id: 'testmany',
        discord_username: 'testusermany',
        discord_avatar: null,
        guild_role: 'senior_guild_member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    // Create multiple approved guides
    const manyGuides = Array.from({ length: 25 }, (_, i) => ({
      title: `Approved Guide ${i + 1}`,
      content: `This is approved guide number ${i + 1} content with enough text to meet minimum requirements for testing purposes and handling multiple guides.`,
      status: 'approved' as const,
      created_by: user.id,
      approved_by: user.id,
      approved_at: new Date()
    }));

    await db.insert(guidesTable)
      .values(manyGuides)
      .execute();

    const result = await getApprovedGuides();

    expect(result).toHaveLength(25);
    expect(result.every(guide => guide.status === 'approved')).toBe(true);
    expect(result.every(guide => guide.title.startsWith('Approved Guide'))).toBe(true);
  });
});