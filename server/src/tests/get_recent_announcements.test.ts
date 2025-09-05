import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, announcementsTable } from '../db/schema';
import { type CreateAnnouncementInput } from '../schema';
import { getRecentAnnouncements } from '../handlers/get_recent_announcements';

describe('getRecentAnnouncements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no announcements exist', async () => {
    const result = await getRecentAnnouncements();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return announcements ordered by creation date (most recent first)', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test-discord-123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create announcements with different timestamps
    const announcement1 = await db.insert(announcementsTable)
      .values({
        title: 'First Announcement',
        content: 'This is the first announcement content.',
        created_by: userId
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 50));

    const announcement2 = await db.insert(announcementsTable)
      .values({
        title: 'Second Announcement',
        content: 'This is the second announcement content.',
        created_by: userId
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 50));

    const announcement3 = await db.insert(announcementsTable)
      .values({
        title: 'Third Announcement',
        content: 'This is the third announcement content.',
        created_by: userId
      })
      .returning()
      .execute();

    const result = await getRecentAnnouncements();

    // Should be ordered by most recent first
    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Third Announcement');
    expect(result[1].title).toEqual('Second Announcement');
    expect(result[2].title).toEqual('First Announcement');

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should include all announcement fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test-discord-456',
        discord_username: 'testuser2',
        discord_avatar: 'avatar-url',
        guild_role: 'guild_master'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create announcement
    await db.insert(announcementsTable)
      .values({
        title: 'Test Announcement',
        content: 'This is a test announcement with all fields.',
        created_by: userId
      })
      .returning()
      .execute();

    const result = await getRecentAnnouncements();

    expect(result).toHaveLength(1);
    
    const announcement = result[0];
    expect(announcement.id).toBeDefined();
    expect(announcement.title).toEqual('Test Announcement');
    expect(announcement.content).toEqual('This is a test announcement with all fields.');
    expect(announcement.created_by).toEqual(userId);
    expect(announcement.created_at).toBeInstanceOf(Date);
  });

  it('should limit results to 10 announcements', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test-discord-789',
        discord_username: 'testuser3',
        discord_avatar: null,
        guild_role: 'vice_guild_master'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 15 announcements
    const announcements = [];
    for (let i = 1; i <= 15; i++) {
      announcements.push({
        title: `Announcement ${i}`,
        content: `Content for announcement ${i}`,
        created_by: userId
      });
    }

    await db.insert(announcementsTable)
      .values(announcements)
      .execute();

    const result = await getRecentAnnouncements();

    // Should only return 10 results due to limit
    expect(result).toHaveLength(10);

    // Should still be ordered by most recent first
    result.forEach((announcement, index) => {
      if (index > 0) {
        expect(announcement.created_at <= result[index - 1].created_at).toBe(true);
      }
    });
  });

  it('should handle announcements from different users', async () => {
    // Create multiple test users
    const user1Result = await db.insert(usersTable)
      .values({
        discord_id: 'user1-discord',
        discord_username: 'user1',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        discord_id: 'user2-discord',
        discord_username: 'user2',
        discord_avatar: 'avatar2.png',
        guild_role: 'vice_guild_master'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create announcements by different users
    await db.insert(announcementsTable)
      .values([
        {
          title: 'User 1 Announcement',
          content: 'Announcement by user 1',
          created_by: user1Id
        },
        {
          title: 'User 2 Announcement',
          content: 'Announcement by user 2',
          created_by: user2Id
        }
      ])
      .execute();

    const result = await getRecentAnnouncements();

    expect(result).toHaveLength(2);
    
    // Verify different users are represented
    const creatorIds = result.map(a => a.created_by);
    expect(creatorIds).toContain(user1Id);
    expect(creatorIds).toContain(user2Id);
  });
});