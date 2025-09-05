import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getAllUsers } from '../handlers/get_all_users';

describe('getAllUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getAllUsers();

    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users
    const testUsers = [
      {
        discord_id: '123456789',
        discord_username: 'TestUser1',
        discord_avatar: 'avatar1.png',
        guild_role: 'guild_master' as const,
        treasury_status: 'paid' as const
      },
      {
        discord_id: '987654321',
        discord_username: 'TestUser2',
        discord_avatar: null,
        guild_role: 'member' as const,
        treasury_status: 'pending' as const
      },
      {
        discord_id: '555666777',
        discord_username: 'TestUser3',
        discord_avatar: 'avatar3.png',
        guild_role: 'recruit' as const,
        treasury_status: 'overdue' as const
      }
    ];

    // Insert test users into database
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(3);
    
    // Check first user
    const user1 = result.find(u => u.discord_username === 'TestUser1');
    expect(user1).toBeDefined();
    expect(user1!.discord_id).toBe('123456789');
    expect(user1!.discord_username).toBe('TestUser1');
    expect(user1!.discord_avatar).toBe('avatar1.png');
    expect(user1!.guild_role).toBe('guild_master');
    expect(user1!.treasury_status).toBe('paid');
    expect(user1!.id).toBeDefined();
    expect(user1!.created_at).toBeInstanceOf(Date);
    expect(user1!.updated_at).toBeInstanceOf(Date);

    // Check second user
    const user2 = result.find(u => u.discord_username === 'TestUser2');
    expect(user2).toBeDefined();
    expect(user2!.discord_id).toBe('987654321');
    expect(user2!.discord_username).toBe('TestUser2');
    expect(user2!.discord_avatar).toBe(null);
    expect(user2!.guild_role).toBe('member');
    expect(user2!.treasury_status).toBe('pending');

    // Check third user
    const user3 = result.find(u => u.discord_username === 'TestUser3');
    expect(user3).toBeDefined();
    expect(user3!.discord_id).toBe('555666777');
    expect(user3!.discord_username).toBe('TestUser3');
    expect(user3!.discord_avatar).toBe('avatar3.png');
    expect(user3!.guild_role).toBe('recruit');
    expect(user3!.treasury_status).toBe('overdue');
  });

  it('should return users with all guild roles', async () => {
    // Create users with different guild roles
    const testUsers = [
      {
        discord_id: '111111111',
        discord_username: 'GuildMaster',
        discord_avatar: null,
        guild_role: 'guild_master' as const
      },
      {
        discord_id: '222222222',
        discord_username: 'ViceGuildMaster',
        discord_avatar: null,
        guild_role: 'vice_guild_master' as const
      },
      {
        discord_id: '333333333',
        discord_username: 'SeniorMember',
        discord_avatar: null,
        guild_role: 'senior_guild_member' as const
      },
      {
        discord_id: '444444444',
        discord_username: 'Member',
        discord_avatar: null,
        guild_role: 'member' as const
      },
      {
        discord_id: '555555555',
        discord_username: 'Recruit',
        discord_avatar: null,
        guild_role: 'recruit' as const
      }
    ];

    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(5);
    
    // Check that all guild roles are present
    const guildRoles = result.map(user => user.guild_role);
    expect(guildRoles).toContain('guild_master');
    expect(guildRoles).toContain('vice_guild_master');
    expect(guildRoles).toContain('senior_guild_member');
    expect(guildRoles).toContain('member');
    expect(guildRoles).toContain('recruit');
  });

  it('should return users with all treasury statuses', async () => {
    // Create users with different treasury statuses
    const testUsers = [
      {
        discord_id: '111111111',
        discord_username: 'PaidUser',
        discord_avatar: null,
        treasury_status: 'paid' as const
      },
      {
        discord_id: '222222222',
        discord_username: 'PendingUser',
        discord_avatar: null,
        treasury_status: 'pending' as const
      },
      {
        discord_id: '333333333',
        discord_username: 'OverdueUser',
        discord_avatar: null,
        treasury_status: 'overdue' as const
      },
      {
        discord_id: '444444444',
        discord_username: 'ExemptUser',
        discord_avatar: null,
        treasury_status: 'exempt' as const
      }
    ];

    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(4);
    
    // Check that all treasury statuses are present
    const treasuryStatuses = result.map(user => user.treasury_status);
    expect(treasuryStatuses).toContain('paid');
    expect(treasuryStatuses).toContain('pending');
    expect(treasuryStatuses).toContain('overdue');
    expect(treasuryStatuses).toContain('exempt');
  });

  it('should handle users with null discord_avatar', async () => {
    const testUser = {
      discord_id: '123456789',
      discord_username: 'TestUser',
      discord_avatar: null,
      guild_role: 'member' as const
    };

    await db.insert(usersTable)
      .values([testUser])
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(1);
    expect(result[0].discord_avatar).toBe(null);
    expect(result[0].discord_username).toBe('TestUser');
  });

  it('should return users in insertion order', async () => {
    const testUsers = [
      {
        discord_id: '111111111',
        discord_username: 'FirstUser',
        discord_avatar: null
      },
      {
        discord_id: '222222222',
        discord_username: 'SecondUser',
        discord_avatar: null
      },
      {
        discord_id: '333333333',
        discord_username: 'ThirdUser',
        discord_avatar: null
      }
    ];

    // Insert users one by one to ensure order
    for (const user of testUsers) {
      await db.insert(usersTable)
        .values([user])
        .execute();
    }

    const result = await getAllUsers();

    expect(result).toHaveLength(3);
    // Results should maintain database insertion order (by id)
    expect(result[0].discord_username).toBe('FirstUser');
    expect(result[1].discord_username).toBe('SecondUser');
    expect(result[2].discord_username).toBe('ThirdUser');
    
    // Verify IDs are in ascending order
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });
});