import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByDiscordIdInput } from '../schema';
import { getUserByDiscordId } from '../handlers/get_user_by_discord_id';

describe('getUserByDiscordId', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found by discord_id', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        discord_id: '123456789012345678',
        discord_username: 'testuser#1234',
        discord_avatar: 'avatar_hash_123',
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const input: GetUserByDiscordIdInput = {
      discord_id: '123456789012345678'
    };

    const result = await getUserByDiscordId(input);

    // Verify user data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testUser[0].id);
    expect(result!.discord_id).toEqual('123456789012345678');
    expect(result!.discord_username).toEqual('testuser#1234');
    expect(result!.discord_avatar).toEqual('avatar_hash_123');
    expect(result!.guild_role).toEqual('member');
    expect(result!.treasury_status).toEqual('paid');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const input: GetUserByDiscordIdInput = {
      discord_id: '999999999999999999'
    };

    const result = await getUserByDiscordId(input);

    expect(result).toBeNull();
  });

  it('should return user with default values', async () => {
    // Create test user with minimal required fields
    const testUser = await db.insert(usersTable)
      .values({
        discord_id: '111111111111111111',
        discord_username: 'newuser#5678',
        discord_avatar: null
      })
      .returning()
      .execute();

    const input: GetUserByDiscordIdInput = {
      discord_id: '111111111111111111'
    };

    const result = await getUserByDiscordId(input);

    // Verify defaults are applied
    expect(result).not.toBeNull();
    expect(result!.discord_id).toEqual('111111111111111111');
    expect(result!.discord_username).toEqual('newuser#5678');
    expect(result!.discord_avatar).toBeNull();
    expect(result!.guild_role).toEqual('recruit'); // Default value
    expect(result!.treasury_status).toEqual('pending'); // Default value
  });

  it('should handle case-sensitive discord_id matching', async () => {
    // Create user with specific discord_id
    await db.insert(usersTable)
      .values({
        discord_id: 'ABC123def456',
        discord_username: 'casetest#0001',
        discord_avatar: null
      })
      .returning()
      .execute();

    // Test exact match
    const exactInput: GetUserByDiscordIdInput = {
      discord_id: 'ABC123def456'
    };
    const exactResult = await getUserByDiscordId(exactInput);
    expect(exactResult).not.toBeNull();

    // Test different case (should not match)
    const wrongCaseInput: GetUserByDiscordIdInput = {
      discord_id: 'abc123def456'
    };
    const wrongCaseResult = await getUserByDiscordId(wrongCaseInput);
    expect(wrongCaseResult).toBeNull();
  });

  it('should return first user when multiple users exist', async () => {
    // Create multiple users with different discord_ids
    const user1 = await db.insert(usersTable)
      .values({
        discord_id: '100000000000000001',
        discord_username: 'user1#0001',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    await db.insert(usersTable)
      .values({
        discord_id: '100000000000000002',
        discord_username: 'user2#0002',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();

    const input: GetUserByDiscordIdInput = {
      discord_id: '100000000000000001'
    };

    const result = await getUserByDiscordId(input);

    // Should return the correct user
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user1[0].id);
    expect(result!.discord_id).toEqual('100000000000000001');
    expect(result!.guild_role).toEqual('member');
  });

  it('should handle special characters in discord_id', async () => {
    // Note: Discord IDs are typically numeric strings, but testing edge cases
    const specialDiscordId = '123-456_789';
    
    await db.insert(usersTable)
      .values({
        discord_id: specialDiscordId,
        discord_username: 'specialuser#9999',
        discord_avatar: null
      })
      .returning()
      .execute();

    const input: GetUserByDiscordIdInput = {
      discord_id: specialDiscordId
    };

    const result = await getUserByDiscordId(input);

    expect(result).not.toBeNull();
    expect(result!.discord_id).toEqual(specialDiscordId);
  });

  it('should return user with all guild roles', async () => {
    const guildRoles = ['guild_master', 'vice_guild_master', 'senior_guild_member', 'member', 'recruit'] as const;
    
    for (let i = 0; i < guildRoles.length; i++) {
      const discordId = `role_test_${Date.now()}_${i}`;
      
      await db.insert(usersTable)
        .values({
          discord_id: discordId,
          discord_username: `roletest${i}#000${i}`,
          discord_avatar: null,
          guild_role: guildRoles[i]
        })
        .returning()
        .execute();

      const input: GetUserByDiscordIdInput = {
        discord_id: discordId
      };

      const result = await getUserByDiscordId(input);

      expect(result).not.toBeNull();
      expect(result!.guild_role).toEqual(guildRoles[i]);
    }
  });

  it('should return user with all treasury statuses', async () => {
    const treasuryStatuses = ['paid', 'pending', 'overdue', 'exempt'] as const;
    
    for (let i = 0; i < treasuryStatuses.length; i++) {
      const discordId = `treasury_test_${Date.now()}_${i}`;
      
      await db.insert(usersTable)
        .values({
          discord_id: discordId,
          discord_username: `treasurytest${i}#000${i}`,
          discord_avatar: null,
          treasury_status: treasuryStatuses[i]
        })
        .returning()
        .execute();

      const input: GetUserByDiscordIdInput = {
        discord_id: discordId
      };

      const result = await getUserByDiscordId(input);

      expect(result).not.toBeNull();
      expect(result!.treasury_status).toEqual(treasuryStatuses[i]);
    }
  });
});