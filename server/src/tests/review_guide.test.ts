import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { guidesTable, usersTable } from '../db/schema';
import { type ReviewGuideInput } from '../schema';
import { reviewGuide } from '../handlers/review_guide';
import { eq } from 'drizzle-orm';

// Test data
let testUser: any;
let testReviewer: any;
let testGuide: any;

describe('reviewGuide', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          discord_id: 'test_user_123',
          discord_username: 'testuser',
          discord_avatar: null,
          guild_role: 'member',
          treasury_status: 'pending'
        },
        {
          discord_id: 'reviewer_456',
          discord_username: 'reviewer',
          discord_avatar: null,
          guild_role: 'vice_guild_master',
          treasury_status: 'paid'
        }
      ])
      .returning()
      .execute();

    testUser = userResults[0];
    testReviewer = userResults[1];

    // Create test guide
    const guideResult = await db.insert(guidesTable)
      .values({
        title: 'Test Guide',
        content: 'This is a comprehensive test guide with detailed information about Dragon Nest mechanics and strategies.',
        created_by: testUser.id,
        status: 'pending'
      })
      .returning()
      .execute();

    testGuide = guideResult[0];
  });

  afterEach(resetDB);

  it('should approve a guide successfully', async () => {
    const input: ReviewGuideInput = {
      guide_id: testGuide.id,
      status: 'approved',
      approved_by: testReviewer.id
    };

    const result = await reviewGuide(input);

    // Basic field validation
    expect(result.id).toEqual(testGuide.id);
    expect(result.status).toEqual('approved');
    expect(result.approved_by).toEqual(testReviewer.id);
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.title).toEqual('Test Guide');
    expect(result.content).toEqual(testGuide.content);
  });

  it('should reject a guide successfully', async () => {
    const input: ReviewGuideInput = {
      guide_id: testGuide.id,
      status: 'rejected',
      approved_by: testReviewer.id
    };

    const result = await reviewGuide(input);

    // Basic field validation
    expect(result.id).toEqual(testGuide.id);
    expect(result.status).toEqual('rejected');
    expect(result.approved_by).toEqual(testReviewer.id);
    expect(result.approved_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.title).toEqual('Test Guide');
  });

  it('should update guide in database', async () => {
    const input: ReviewGuideInput = {
      guide_id: testGuide.id,
      status: 'approved',
      approved_by: testReviewer.id
    };

    await reviewGuide(input);

    // Verify database was updated
    const updatedGuide = await db.select()
      .from(guidesTable)
      .where(eq(guidesTable.id, testGuide.id))
      .execute();

    expect(updatedGuide).toHaveLength(1);
    expect(updatedGuide[0].status).toEqual('approved');
    expect(updatedGuide[0].approved_by).toEqual(testReviewer.id);
    expect(updatedGuide[0].approved_at).toBeInstanceOf(Date);
    expect(updatedGuide[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle rejected guides correctly in database', async () => {
    const input: ReviewGuideInput = {
      guide_id: testGuide.id,
      status: 'rejected',
      approved_by: testReviewer.id
    };

    await reviewGuide(input);

    // Verify database was updated correctly for rejection
    const updatedGuide = await db.select()
      .from(guidesTable)
      .where(eq(guidesTable.id, testGuide.id))
      .execute();

    expect(updatedGuide).toHaveLength(1);
    expect(updatedGuide[0].status).toEqual('rejected');
    expect(updatedGuide[0].approved_by).toEqual(testReviewer.id);
    expect(updatedGuide[0].approved_at).toBeNull();
    expect(updatedGuide[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent guide', async () => {
    const input: ReviewGuideInput = {
      guide_id: 99999,
      status: 'approved',
      approved_by: testReviewer.id
    };

    await expect(reviewGuide(input)).rejects.toThrow(/guide not found/i);
  });

  it('should preserve original guide data when reviewing', async () => {
    const input: ReviewGuideInput = {
      guide_id: testGuide.id,
      status: 'approved',
      approved_by: testReviewer.id
    };

    const result = await reviewGuide(input);

    // Ensure original data is preserved
    expect(result.title).toEqual(testGuide.title);
    expect(result.content).toEqual(testGuide.content);
    expect(result.created_by).toEqual(testGuide.created_by);
    expect(result.created_at).toEqual(testGuide.created_at);
  });

  it('should allow re-reviewing a guide', async () => {
    // First review - approve
    const approveInput: ReviewGuideInput = {
      guide_id: testGuide.id,
      status: 'approved',
      approved_by: testReviewer.id
    };

    await reviewGuide(approveInput);

    // Second review - reject
    const rejectInput: ReviewGuideInput = {
      guide_id: testGuide.id,
      status: 'rejected',
      approved_by: testReviewer.id
    };

    const result = await reviewGuide(rejectInput);

    expect(result.status).toEqual('rejected');
    expect(result.approved_at).toBeNull();
    expect(result.approved_by).toEqual(testReviewer.id);
  });
});