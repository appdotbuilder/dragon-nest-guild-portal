import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  discord_id: '123456789012345678',
  discord_username: 'testuser123',
  discord_avatar: 'https://cdn.discordapp.com/avatars/123456789012345678/abc123.png',
  guild_role: 'member'
};

// Test input with minimal required fields
const minimalInput: CreateUserInput = {
  discord_id: '987654321098765432',
  discord_username: 'minimaluser',
  discord_avatar: null,
  guild_role: 'recruit' // Include required field
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields provided', async () => {
    const result = await createUser(testInput);

    // Verify all fields are correctly set
    expect(result.discord_id).toEqual('123456789012345678');
    expect(result.discord_username).toEqual('testuser123');
    expect(result.discord_avatar).toEqual('https://cdn.discordapp.com/avatars/123456789012345678/abc123.png');
    expect(result.guild_role).toEqual('member');
    expect(result.treasury_status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal fields and apply defaults', async () => {
    const result = await createUser(minimalInput);

    // Verify fields and defaults
    expect(result.discord_id).toEqual('987654321098765432');
    expect(result.discord_username).toEqual('minimaluser');
    expect(result.discord_avatar).toBeNull();
    expect(result.guild_role).toEqual('recruit'); // Default from Zod schema
    expect(result.treasury_status).toEqual('pending'); // Default from handler
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(testInput);

    // Query database to verify persistence
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.discord_id).toEqual('123456789012345678');
    expect(savedUser.discord_username).toEqual('testuser123');
    expect(savedUser.discord_avatar).toEqual('https://cdn.discordapp.com/avatars/123456789012345678/abc123.png');
    expect(savedUser.guild_role).toEqual('member');
    expect(savedUser.treasury_status).toEqual('pending');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null discord_avatar correctly', async () => {
    const inputWithNullAvatar: CreateUserInput = {
      discord_id: '111222333444555666',
      discord_username: 'noavataruser',
      discord_avatar: null,
      guild_role: 'senior_guild_member'
    };

    const result = await createUser(inputWithNullAvatar);

    expect(result.discord_avatar).toBeNull();
    expect(result.guild_role).toEqual('senior_guild_member');

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.discord_id, '111222333444555666'))
      .execute();

    expect(users[0].discord_avatar).toBeNull();
  });

  it('should enforce unique discord_id constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create user with same discord_id should fail
    const duplicateInput: CreateUserInput = {
      discord_id: '123456789012345678', // Same as testInput
      discord_username: 'differentusername',
      discord_avatar: null,
      guild_role: 'recruit'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle all valid guild roles', async () => {
    const guildRoles = ['guild_master', 'vice_guild_master', 'senior_guild_member', 'member', 'recruit'] as const;

    for (let i = 0; i < guildRoles.length; i++) {
      const roleInput: CreateUserInput = {
        discord_id: `role_test_${i}_${Date.now()}`, // Generate truly unique discord_ids
        discord_username: `user_${guildRoles[i]}_${i}`,
        discord_avatar: null,
        guild_role: guildRoles[i]
      };

      const result = await createUser(roleInput);
      expect(result.guild_role).toEqual(guildRoles[i]);
    }

    // Verify correct number of users were created in this test
    const testUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(testUsers.length).toBeGreaterThanOrEqual(guildRoles.length);
  });

  it('should set timestamps correctly', async () => {
    const timestampTestInput: CreateUserInput = {
      discord_id: `timestamp_test_${Date.now()}`,
      discord_username: 'timestamp_user',
      discord_avatar: null,
      guild_role: 'recruit'
    };

    const beforeCreate = new Date();
    const result = await createUser(timestampTestInput);
    const afterCreate = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // For new records, created_at and updated_at should be very close
    const timeDiff = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
  });
});