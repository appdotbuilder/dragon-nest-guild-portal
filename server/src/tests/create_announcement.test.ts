import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { announcementsTable, usersTable } from '../db/schema';
import { type CreateAnnouncementInput } from '../schema';
import { createAnnouncement } from '../handlers/create_announcement';
import { eq } from 'drizzle-orm';

// Test user for creating announcements
const testUser = {
  discord_id: 'test_discord_123',
  discord_username: 'TestGuildMaster',
  discord_avatar: 'avatar_url.png',
  guild_role: 'guild_master' as const
};

// Simple test input
const testInput: CreateAnnouncementInput = {
  title: 'Important Guild Update',
  content: 'This is an important announcement about upcoming guild events and changes to our policies.',
  created_by: 1 // Will be set after user creation
};

describe('createAnnouncement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an announcement', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const announcementInput = { ...testInput, created_by: userId };

    const result = await createAnnouncement(announcementInput);

    // Basic field validation
    expect(result.title).toEqual('Important Guild Update');
    expect(result.content).toEqual(testInput.content);
    expect(result.created_by).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save announcement to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const announcementInput = { ...testInput, created_by: userId };

    const result = await createAnnouncement(announcementInput);

    // Query using proper drizzle syntax
    const announcements = await db.select()
      .from(announcementsTable)
      .where(eq(announcementsTable.id, result.id))
      .execute();

    expect(announcements).toHaveLength(1);
    expect(announcements[0].title).toEqual('Important Guild Update');
    expect(announcements[0].content).toEqual(testInput.content);
    expect(announcements[0].created_by).toEqual(userId);
    expect(announcements[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when creator user does not exist', async () => {
    const announcementInput = { ...testInput, created_by: 999 }; // Non-existent user

    await expect(createAnnouncement(announcementInput)).rejects.toThrow(/Creator user does not exist/i);
  });

  it('should handle long content correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    const longContent = 'A'.repeat(1500); // Long but within schema limits
    const announcementInput = {
      ...testInput,
      content: longContent,
      created_by: userId
    };

    const result = await createAnnouncement(announcementInput);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(1500);
  });

  it('should create multiple announcements by the same user', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const announcement1 = {
      title: 'First Announcement',
      content: 'This is the first announcement.',
      created_by: userId
    };

    const announcement2 = {
      title: 'Second Announcement', 
      content: 'This is the second announcement.',
      created_by: userId
    };

    const result1 = await createAnnouncement(announcement1);
    const result2 = await createAnnouncement(announcement2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('First Announcement');
    expect(result2.title).toEqual('Second Announcement');
    expect(result1.created_by).toEqual(userId);
    expect(result2.created_by).toEqual(userId);

    // Verify both exist in database
    const allAnnouncements = await db.select()
      .from(announcementsTable)
      .where(eq(announcementsTable.created_by, userId))
      .execute();

    expect(allAnnouncements).toHaveLength(2);
  });

  it('should handle special characters in title and content', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    const specialContent = 'Guild update! @everyone - New rules: 1) No drama 2) Be respectful 😊 #guild #update';
    const announcementInput = {
      title: 'Special Chars: @#$%',
      content: specialContent,
      created_by: userId
    };

    const result = await createAnnouncement(announcementInput);

    expect(result.title).toEqual('Special Chars: @#$%');
    expect(result.content).toEqual(specialContent);
  });
});