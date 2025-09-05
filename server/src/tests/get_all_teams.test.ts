import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembersTable } from '../db/schema';
import { getAllTeams } from '../handlers/get_all_teams';

describe('getAllTeams', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no teams exist', async () => {
    const result = await getAllTeams();

    expect(result).toEqual([]);
  });

  it('should return all teams with proper structure', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_123',
        discord_username: 'testuser',
        discord_avatar: 'avatar.jpg',
        guild_role: 'member'
      })
      .returning()
      .execute();

    // Create test teams
    const teams = await db.insert(teamsTable)
      .values([
        {
          name: 'Team Alpha',
          description: 'First team',
          created_by: user.id,
          discord_channel_id: 'channel_1',
          max_members: 5
        },
        {
          name: 'Team Beta',
          description: 'Second team',
          created_by: user.id,
          discord_channel_id: null,
          max_members: 10
        }
      ])
      .returning()
      .execute();

    const result = await getAllTeams();

    expect(result).toHaveLength(2);
    
    // Find teams by name since order may vary when created in same transaction
    const teamAlpha = result.find(t => t.name === 'Team Alpha');
    const teamBeta = result.find(t => t.name === 'Team Beta');
    
    expect(teamAlpha).toBeDefined();
    expect(teamBeta).toBeDefined();
    
    // Verify Team Alpha
    expect(teamAlpha!.description).toEqual('First team');
    expect(teamAlpha!.created_by).toEqual(user.id);
    expect(teamAlpha!.discord_channel_id).toEqual('channel_1');
    expect(teamAlpha!.max_members).toEqual(5);
    expect(teamAlpha!.id).toBeDefined();
    expect(teamAlpha!.created_at).toBeInstanceOf(Date);

    // Verify Team Beta
    expect(teamBeta!.description).toEqual('Second team');
    expect(teamBeta!.created_by).toEqual(user.id);
    expect(teamBeta!.discord_channel_id).toBeNull();
    expect(teamBeta!.max_members).toEqual(10);
    expect(teamBeta!.id).toBeDefined();
    expect(teamBeta!.created_at).toBeInstanceOf(Date);
  });

  it('should return teams ordered by creation date', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        discord_id: 'test_discord_456',
        discord_username: 'testuser2',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    // Create teams with different creation times
    const [firstTeam] = await db.insert(teamsTable)
      .values({
        name: 'Older Team',
        description: 'Created first',
        created_by: user.id,
        max_members: 3
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [secondTeam] = await db.insert(teamsTable)
      .values({
        name: 'Newer Team',
        description: 'Created second',
        created_by: user.id,
        max_members: 8
      })
      .returning()
      .execute();

    const result = await getAllTeams();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Older Team');
    expect(result[1].name).toEqual('Newer Team');
    expect(result[0].created_at.getTime()).toBeLessThan(result[1].created_at.getTime());
  });

  it('should handle teams with members correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          discord_id: 'creator_123',
          discord_username: 'creator',
          discord_avatar: null,
          guild_role: 'guild_master'
        },
        {
          discord_id: 'member_456',
          discord_username: 'member1',
          discord_avatar: 'avatar1.jpg',
          guild_role: 'member'
        },
        {
          discord_id: 'member_789',
          discord_username: 'member2',
          discord_avatar: 'avatar2.jpg',
          guild_role: 'member'
        }
      ])
      .returning()
      .execute();

    // Create team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Team with Members',
        description: 'A team that has members',
        created_by: users[0].id,
        max_members: 5
      })
      .returning()
      .execute();

    // Add team members
    await db.insert(teamMembersTable)
      .values([
        {
          team_id: team.id,
          user_id: users[1].id
        },
        {
          team_id: team.id,
          user_id: users[2].id
        }
      ])
      .execute();

    const result = await getAllTeams();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Team with Members');
    expect(result[0].id).toEqual(team.id);
    
    // Verify the team structure is correct (member count is not included in return type)
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('description');
    expect(result[0]).toHaveProperty('created_by');
    expect(result[0]).toHaveProperty('discord_channel_id');
    expect(result[0]).toHaveProperty('max_members');
    expect(result[0]).toHaveProperty('created_at');
  });

  it('should handle teams with no members correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        discord_id: 'solo_creator_999',
        discord_username: 'solocreator',
        discord_avatar: null,
        guild_role: 'senior_guild_member'
      })
      .returning()
      .execute();

    // Create team without any members
    await db.insert(teamsTable)
      .values({
        name: 'Empty Team',
        description: null,
        created_by: user.id,
        max_members: 2
      })
      .execute();

    const result = await getAllTeams();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Empty Team');
    expect(result[0].description).toBeNull();
    expect(result[0].created_by).toEqual(user.id);
    expect(result[0].max_members).toEqual(2);
  });

  it('should handle multiple teams with varying member counts', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          discord_id: 'user_1',
          discord_username: 'user1',
          discord_avatar: null,
          guild_role: 'guild_master'
        },
        {
          discord_id: 'user_2',
          discord_username: 'user2',
          discord_avatar: null,
          guild_role: 'member'
        },
        {
          discord_id: 'user_3',
          discord_username: 'user3',
          discord_avatar: null,
          guild_role: 'member'
        }
      ])
      .returning()
      .execute();

    // Create multiple teams
    const teams = await db.insert(teamsTable)
      .values([
        {
          name: 'Team One',
          description: 'Team with one member',
          created_by: users[0].id,
          max_members: 3
        },
        {
          name: 'Team Two',
          description: 'Team with no members',
          created_by: users[0].id,
          max_members: 4
        }
      ])
      .returning()
      .execute();

    // Add one member to first team
    await db.insert(teamMembersTable)
      .values({
        team_id: teams[0].id,
        user_id: users[1].id
      })
      .execute();

    const result = await getAllTeams();

    expect(result).toHaveLength(2);
    
    const teamOne = result.find(t => t.name === 'Team One');
    const teamTwo = result.find(t => t.name === 'Team Two');
    
    expect(teamOne).toBeDefined();
    expect(teamTwo).toBeDefined();
    
    expect(teamOne!.max_members).toEqual(3);
    expect(teamTwo!.max_members).toEqual(4);
  });
});