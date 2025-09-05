import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, recruitmentApplicationsTable } from '../db/schema';
import { type CreateUserInput, type CreateRecruitmentApplicationInput } from '../schema';
import { getPendingRecruitmentApplications } from '../handlers/get_pending_recruitment_applications';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  discord_id: '123456789',
  discord_username: 'TestUser',
  discord_avatar: null,
  guild_role: 'recruit'
};

const testApplication: CreateRecruitmentApplicationInput = {
  user_id: 1, // Will be set after user creation
  application_text: 'This is a test application with more than 50 characters to meet the minimum requirements for the application text field.'
};

describe('getPendingRecruitmentApplications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no applications exist', async () => {
    const result = await getPendingRecruitmentApplications();

    expect(result).toEqual([]);
  });

  it('should return pending recruitment applications', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: testUser.discord_id,
        discord_username: testUser.discord_username,
        discord_avatar: testUser.discord_avatar,
        guild_role: testUser.guild_role
      })
      .returning()
      .execute();

    const createdUser = userResult[0];

    // Create a pending application
    await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: createdUser.id,
        application_text: testApplication.application_text,
        status: 'pending'
      })
      .execute();

    const result = await getPendingRecruitmentApplications();

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(createdUser.id);
    expect(result[0].application_text).toEqual(testApplication.application_text);
    expect(result[0].status).toEqual('pending');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].reviewed_by).toBeNull();
    expect(result[0].reviewed_at).toBeNull();
  });

  it('should return multiple pending applications', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'TestUser1',
        discord_avatar: null,
        guild_role: 'recruit'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        discord_id: '987654321',
        discord_username: 'TestUser2',
        discord_avatar: null,
        guild_role: 'recruit'
      })
      .returning()
      .execute();

    // Create multiple pending applications
    await db.insert(recruitmentApplicationsTable)
      .values([
        {
          user_id: user1Result[0].id,
          application_text: 'First application with sufficient characters to meet minimum requirements.',
          status: 'pending'
        },
        {
          user_id: user2Result[0].id,
          application_text: 'Second application with sufficient characters to meet minimum requirements.',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getPendingRecruitmentApplications();

    expect(result).toHaveLength(2);
    expect(result.every(app => app.status === 'pending')).toBe(true);
    expect(result.every(app => app.reviewed_by === null)).toBe(true);
    expect(result.every(app => app.reviewed_at === null)).toBe(true);
  });

  it('should not return approved applications', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'TestUser1',
        discord_avatar: null,
        guild_role: 'recruit'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        discord_id: '987654321',
        discord_username: 'TestUser2',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    // Create applications with different statuses
    await db.insert(recruitmentApplicationsTable)
      .values([
        {
          user_id: user1Result[0].id,
          application_text: 'Pending application with sufficient characters to meet minimum requirements.',
          status: 'pending'
        },
        {
          user_id: user2Result[0].id,
          application_text: 'Approved application with sufficient characters to meet minimum requirements.',
          status: 'approved',
          reviewed_by: user2Result[0].id,
          reviewed_at: new Date()
        }
      ])
      .execute();

    const result = await getPendingRecruitmentApplications();

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('pending');
    expect(result[0].user_id).toEqual(user1Result[0].id);
  });

  it('should not return rejected applications', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'TestUser1',
        discord_avatar: null,
        guild_role: 'recruit'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        discord_id: '987654321',
        discord_username: 'TestUser2',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    // Create applications with different statuses
    await db.insert(recruitmentApplicationsTable)
      .values([
        {
          user_id: user1Result[0].id,
          application_text: 'Pending application with sufficient characters to meet minimum requirements.',
          status: 'pending'
        },
        {
          user_id: user2Result[0].id,
          application_text: 'Rejected application with sufficient characters to meet minimum requirements.',
          status: 'rejected',
          reviewed_by: user2Result[0].id,
          reviewed_at: new Date()
        }
      ])
      .execute();

    const result = await getPendingRecruitmentApplications();

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('pending');
    expect(result[0].user_id).toEqual(user1Result[0].id);
  });

  it('should save applications with correct foreign key relationships', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: testUser.discord_id,
        discord_username: testUser.discord_username,
        discord_avatar: testUser.discord_avatar,
        guild_role: testUser.guild_role
      })
      .returning()
      .execute();

    const createdUser = userResult[0];

    // Create a pending application
    await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: createdUser.id,
        application_text: testApplication.application_text,
        status: 'pending'
      })
      .execute();

    // Fetch the application and verify it exists in database
    const applications = await db.select()
      .from(recruitmentApplicationsTable)
      .where(eq(recruitmentApplicationsTable.user_id, createdUser.id))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].user_id).toEqual(createdUser.id);
    expect(applications[0].status).toEqual('pending');

    // Test the handler function
    const result = await getPendingRecruitmentApplications();
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(createdUser.id);
  });
});