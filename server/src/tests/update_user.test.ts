import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test data
const testCreateUserInput: CreateUserInput = {
  discord_id: '123456789',
  discord_username: 'TestUser',
  discord_avatar: 'https://example.com/avatar.png',
  guild_role: 'recruit'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update guild role', async () => {
    // Create a user first
    const createdUsers = await db.insert(usersTable)
      .values({
        discord_id: testCreateUserInput.discord_id,
        discord_username: testCreateUserInput.discord_username,
        discord_avatar: testCreateUserInput.discord_avatar,
        guild_role: testCreateUserInput.guild_role
      })
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Update guild role
    const updateInput: UpdateUserInput = {
      id: userId,
      guild_role: 'member'
    };

    const result = await updateUser(updateInput);

    // Verify the update
    expect(result.id).toEqual(userId);
    expect(result.guild_role).toEqual('member');
    expect(result.treasury_status).toEqual('pending'); // Should remain unchanged
    expect(result.discord_id).toEqual(testCreateUserInput.discord_id);
    expect(result.discord_username).toEqual(testCreateUserInput.discord_username);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update treasury status', async () => {
    // Create a user first
    const createdUsers = await db.insert(usersTable)
      .values({
        discord_id: testCreateUserInput.discord_id,
        discord_username: testCreateUserInput.discord_username,
        discord_avatar: testCreateUserInput.discord_avatar,
        guild_role: testCreateUserInput.guild_role
      })
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Update treasury status
    const updateInput: UpdateUserInput = {
      id: userId,
      treasury_status: 'paid'
    };

    const result = await updateUser(updateInput);

    // Verify the update
    expect(result.id).toEqual(userId);
    expect(result.treasury_status).toEqual('paid');
    expect(result.guild_role).toEqual('recruit'); // Should remain unchanged
    expect(result.discord_id).toEqual(testCreateUserInput.discord_id);
    expect(result.discord_username).toEqual(testCreateUserInput.discord_username);
  });

  it('should update both guild role and treasury status', async () => {
    // Create a user first
    const createdUsers = await db.insert(usersTable)
      .values({
        discord_id: testCreateUserInput.discord_id,
        discord_username: testCreateUserInput.discord_username,
        discord_avatar: testCreateUserInput.discord_avatar,
        guild_role: testCreateUserInput.guild_role
      })
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Update both fields
    const updateInput: UpdateUserInput = {
      id: userId,
      guild_role: 'senior_guild_member',
      treasury_status: 'exempt'
    };

    const result = await updateUser(updateInput);

    // Verify both updates
    expect(result.id).toEqual(userId);
    expect(result.guild_role).toEqual('senior_guild_member');
    expect(result.treasury_status).toEqual('exempt');
    expect(result.discord_id).toEqual(testCreateUserInput.discord_id);
    expect(result.discord_username).toEqual(testCreateUserInput.discord_username);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    // Create a user first
    const createdUsers = await db.insert(usersTable)
      .values({
        discord_id: testCreateUserInput.discord_id,
        discord_username: testCreateUserInput.discord_username,
        discord_avatar: testCreateUserInput.discord_avatar,
        guild_role: testCreateUserInput.guild_role
      })
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Update the user
    const updateInput: UpdateUserInput = {
      id: userId,
      guild_role: 'vice_guild_master',
      treasury_status: 'overdue'
    };

    await updateUser(updateInput);

    // Query database to verify the changes were persisted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].guild_role).toEqual('vice_guild_master');
    expect(users[0].treasury_status).toEqual('overdue');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    // Create a user first
    const createdUsers = await db.insert(usersTable)
      .values({
        discord_id: testCreateUserInput.discord_id,
        discord_username: testCreateUserInput.discord_username,
        discord_avatar: testCreateUserInput.discord_avatar,
        guild_role: testCreateUserInput.guild_role
      })
      .returning()
      .execute();

    const userId = createdUsers[0].id;
    const originalUpdatedAt = createdUsers[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the user
    const updateInput: UpdateUserInput = {
      id: userId,
      guild_role: 'member'
    };

    const result = await updateUser(updateInput);

    // Verify updated_at was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when user not found', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999, // Non-existent user ID
      guild_role: 'member'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should handle promotion scenarios correctly', async () => {
    // Create a recruit user
    const createdUsers = await db.insert(usersTable)
      .values({
        discord_id: testCreateUserInput.discord_id,
        discord_username: testCreateUserInput.discord_username,
        discord_avatar: testCreateUserInput.discord_avatar,
        guild_role: 'recruit'
      })
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Promote to member
    let result = await updateUser({
      id: userId,
      guild_role: 'member'
    });
    expect(result.guild_role).toEqual('member');

    // Promote to senior guild member
    result = await updateUser({
      id: userId,
      guild_role: 'senior_guild_member'
    });
    expect(result.guild_role).toEqual('senior_guild_member');

    // Promote to guild master
    result = await updateUser({
      id: userId,
      guild_role: 'guild_master'
    });
    expect(result.guild_role).toEqual('guild_master');
  });

  it('should handle treasury status changes correctly', async () => {
    // Create a user with pending treasury status
    const createdUsers = await db.insert(usersTable)
      .values({
        discord_id: testCreateUserInput.discord_id,
        discord_username: testCreateUserInput.discord_username,
        discord_avatar: testCreateUserInput.discord_avatar,
        guild_role: 'member',
        treasury_status: 'pending'
      })
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Mark as paid
    let result = await updateUser({
      id: userId,
      treasury_status: 'paid'
    });
    expect(result.treasury_status).toEqual('paid');

    // Mark as overdue
    result = await updateUser({
      id: userId,
      treasury_status: 'overdue'
    });
    expect(result.treasury_status).toEqual('overdue');

    // Mark as exempt
    result = await updateUser({
      id: userId,
      treasury_status: 'exempt'
    });
    expect(result.treasury_status).toEqual('exempt');
  });
});