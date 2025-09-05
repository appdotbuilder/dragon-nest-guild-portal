import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { recruitmentApplicationsTable, usersTable } from '../db/schema';
import { type CreateRecruitmentApplicationInput } from '../schema';
import { createRecruitmentApplication } from '../handlers/create_recruitment_application';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  discord_id: 'test_discord_123',
  discord_username: 'TestUser',
  discord_avatar: 'avatar_url.png',
  guild_role: 'recruit' as const
};

// Test input data
const testInput: CreateRecruitmentApplicationInput = {
  user_id: 0, // Will be set after user creation
  application_text: 'I would like to join the guild because I am passionate about Dragon Nest and want to contribute to a great community. I have been playing for 3 years and main a Gladiator with high-end gear.'
};

describe('createRecruitmentApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a recruitment application', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testInput, user_id: userId };

    const result = await createRecruitmentApplication(input);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.application_text).toEqual(testInput.application_text);
    expect(result.status).toEqual('pending');
    expect(result.reviewed_by).toBeNull();
    expect(result.reviewed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save recruitment application to database', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testInput, user_id: userId };

    const result = await createRecruitmentApplication(input);

    // Query using proper drizzle syntax
    const applications = await db.select()
      .from(recruitmentApplicationsTable)
      .where(eq(recruitmentApplicationsTable.id, result.id))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].user_id).toEqual(userId);
    expect(applications[0].application_text).toEqual(testInput.application_text);
    expect(applications[0].status).toEqual('pending');
    expect(applications[0].reviewed_by).toBeNull();
    expect(applications[0].reviewed_at).toBeNull();
    expect(applications[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple applications for different users', async () => {
    // Create first user and application
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const input1 = { ...testInput, user_id: user1Id };

    // Create second user and application
    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        discord_id: 'test_discord_456',
        discord_username: 'TestUser2'
      })
      .returning()
      .execute();
    
    const user2Id = user2Result[0].id;
    const input2 = {
      user_id: user2Id,
      application_text: 'Different application text for second user with experience in PvP and guild leadership.'
    };

    const result1 = await createRecruitmentApplication(input1);
    const result2 = await createRecruitmentApplication(input2);

    // Verify both applications exist
    expect(result1.user_id).toEqual(user1Id);
    expect(result1.application_text).toEqual(testInput.application_text);
    expect(result2.user_id).toEqual(user2Id);
    expect(result2.application_text).toEqual(input2.application_text);

    // Verify in database
    const allApplications = await db.select()
      .from(recruitmentApplicationsTable)
      .execute();

    expect(allApplications).toHaveLength(2);
    const userIds = allApplications.map(app => app.user_id).sort();
    expect(userIds).toEqual([user1Id, user2Id].sort());
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 999;
    const input = { ...testInput, user_id: nonExistentUserId };

    await expect(createRecruitmentApplication(input)).rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should handle long application text correctly', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create application with maximum allowed length (1000 characters from Zod schema)
    const longText = 'A'.repeat(1000);
    const input = { 
      user_id: userId, 
      application_text: longText 
    };

    const result = await createRecruitmentApplication(input);

    expect(result.application_text).toEqual(longText);
    expect(result.application_text.length).toEqual(1000);

    // Verify in database
    const storedApplication = await db.select()
      .from(recruitmentApplicationsTable)
      .where(eq(recruitmentApplicationsTable.id, result.id))
      .execute();

    expect(storedApplication[0].application_text).toEqual(longText);
  });

  it('should set default status to pending', async () => {
    // Create prerequisite user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testInput, user_id: userId };

    const result = await createRecruitmentApplication(input);

    expect(result.status).toEqual('pending');
    
    // Verify nullable fields are properly null
    expect(result.reviewed_by).toBeNull();
    expect(result.reviewed_at).toBeNull();
  });
});