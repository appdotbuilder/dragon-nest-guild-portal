import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, recruitmentApplicationsTable } from '../db/schema';
import { type ReviewRecruitmentApplicationInput } from '../schema';
import { reviewRecruitmentApplication } from '../handlers/review_recruitment_application';
import { eq } from 'drizzle-orm';

describe('reviewRecruitmentApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should approve application and promote user to member', async () => {
    // Create test user (recruit status)
    const users = await db.insert(usersTable)
      .values({
        discord_id: 'user123',
        discord_username: 'TestUser',
        discord_avatar: null,
        guild_role: 'recruit',
        treasury_status: 'pending'
      })
      .returning()
      .execute();
    const testUser = users[0];

    // Create reviewer user
    const reviewers = await db.insert(usersTable)
      .values({
        discord_id: 'reviewer456',
        discord_username: 'ReviewerUser',
        discord_avatar: null,
        guild_role: 'vice_guild_master',
        treasury_status: 'paid'
      })
      .returning()
      .execute();
    const reviewer = reviewers[0];

    // Create recruitment application
    const applications = await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: testUser.id,
        application_text: 'I want to join this guild because I love Dragon Nest and would like to contribute to the community.',
        status: 'pending'
      })
      .returning()
      .execute();
    const application = applications[0];

    const input: ReviewRecruitmentApplicationInput = {
      application_id: application.id,
      status: 'approved',
      reviewed_by: reviewer.id
    };

    const result = await reviewRecruitmentApplication(input);

    // Verify application update
    expect(result.id).toEqual(application.id);
    expect(result.status).toEqual('approved');
    expect(result.reviewed_by).toEqual(reviewer.id);
    expect(result.reviewed_at).toBeInstanceOf(Date);
    expect(result.user_id).toEqual(testUser.id);
    expect(result.application_text).toEqual(application.application_text);

    // Verify user was promoted to member
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();
    
    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].guild_role).toEqual('member');
    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject application without promoting user', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        discord_id: 'user789',
        discord_username: 'TestUser2',
        discord_avatar: null,
        guild_role: 'recruit',
        treasury_status: 'pending'
      })
      .returning()
      .execute();
    const testUser = users[0];

    // Create reviewer
    const reviewers = await db.insert(usersTable)
      .values({
        discord_id: 'reviewer101',
        discord_username: 'ReviewerUser2',
        discord_avatar: null,
        guild_role: 'guild_master',
        treasury_status: 'exempt'
      })
      .returning()
      .execute();
    const reviewer = reviewers[0];

    // Create recruitment application
    const applications = await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: testUser.id,
        application_text: 'Short application text that might not meet requirements.',
        status: 'pending'
      })
      .returning()
      .execute();
    const application = applications[0];

    const input: ReviewRecruitmentApplicationInput = {
      application_id: application.id,
      status: 'rejected',
      reviewed_by: reviewer.id
    };

    const result = await reviewRecruitmentApplication(input);

    // Verify application was rejected
    expect(result.status).toEqual('rejected');
    expect(result.reviewed_by).toEqual(reviewer.id);
    expect(result.reviewed_at).toBeInstanceOf(Date);

    // Verify user role remained unchanged
    const unchangedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();
    
    expect(unchangedUsers[0].guild_role).toEqual('recruit');
  });

  it('should save review data to database correctly', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([
        {
          discord_id: 'applicant001',
          discord_username: 'Applicant',
          discord_avatar: null,
          guild_role: 'recruit',
          treasury_status: 'pending'
        },
        {
          discord_id: 'reviewer001',
          discord_username: 'Reviewer',
          discord_avatar: null,
          guild_role: 'senior_guild_member',
          treasury_status: 'paid'
        }
      ])
      .returning()
      .execute();
    
    const [applicant, reviewer] = users;

    const applications = await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: applicant.id,
        application_text: 'This is my detailed application explaining why I want to join the guild.',
        status: 'pending'
      })
      .returning()
      .execute();
    const application = applications[0];

    const input: ReviewRecruitmentApplicationInput = {
      application_id: application.id,
      status: 'approved',
      reviewed_by: reviewer.id
    };

    await reviewRecruitmentApplication(input);

    // Query database directly to verify changes
    const reviewedApplications = await db.select()
      .from(recruitmentApplicationsTable)
      .where(eq(recruitmentApplicationsTable.id, application.id))
      .execute();

    expect(reviewedApplications).toHaveLength(1);
    const reviewedApp = reviewedApplications[0];
    expect(reviewedApp.status).toEqual('approved');
    expect(reviewedApp.reviewed_by).toEqual(reviewer.id);
    expect(reviewedApp.reviewed_at).toBeInstanceOf(Date);
    expect(reviewedApp.user_id).toEqual(applicant.id);
  });

  it('should throw error when application not found', async () => {
    // Create reviewer
    const reviewers = await db.insert(usersTable)
      .values({
        discord_id: 'reviewer999',
        discord_username: 'TestReviewer',
        discord_avatar: null,
        guild_role: 'guild_master',
        treasury_status: 'exempt'
      })
      .returning()
      .execute();
    const reviewer = reviewers[0];

    const input: ReviewRecruitmentApplicationInput = {
      application_id: 99999, // Non-existent application
      status: 'approved',
      reviewed_by: reviewer.id
    };

    await expect(reviewRecruitmentApplication(input))
      .rejects.toThrow(/application not found/i);
  });

  it('should throw error when reviewer not found', async () => {
    // Create test user and application
    const users = await db.insert(usersTable)
      .values({
        discord_id: 'user555',
        discord_username: 'TestUser',
        discord_avatar: null,
        guild_role: 'recruit',
        treasury_status: 'pending'
      })
      .returning()
      .execute();
    const testUser = users[0];

    const applications = await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: testUser.id,
        application_text: 'Valid application text for testing error handling.',
        status: 'pending'
      })
      .returning()
      .execute();
    const application = applications[0];

    const input: ReviewRecruitmentApplicationInput = {
      application_id: application.id,
      status: 'approved',
      reviewed_by: 88888 // Non-existent reviewer
    };

    await expect(reviewRecruitmentApplication(input))
      .rejects.toThrow(/reviewer not found/i);
  });

  it('should throw error when application already reviewed', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          discord_id: 'user777',
          discord_username: 'TestUser',
          discord_avatar: null,
          guild_role: 'recruit',
          treasury_status: 'pending'
        },
        {
          discord_id: 'reviewer777',
          discord_username: 'TestReviewer',
          discord_avatar: null,
          guild_role: 'vice_guild_master',
          treasury_status: 'paid'
        }
      ])
      .returning()
      .execute();
    
    const [testUser, reviewer] = users;

    // Create already reviewed application
    const applications = await db.insert(recruitmentApplicationsTable)
      .values({
        user_id: testUser.id,
        application_text: 'Application text for testing duplicate review.',
        status: 'approved', // Already reviewed
        reviewed_by: reviewer.id,
        reviewed_at: new Date()
      })
      .returning()
      .execute();
    const application = applications[0];

    const input: ReviewRecruitmentApplicationInput = {
      application_id: application.id,
      status: 'rejected',
      reviewed_by: reviewer.id
    };

    await expect(reviewRecruitmentApplication(input))
      .rejects.toThrow(/already been reviewed/i);
  });
});