import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembersTable } from '../db/schema';
import { type GetTeamMembersInput } from '../schema';
import { getTeamMembers } from '../handlers/get_team_members';
import { eq } from 'drizzle-orm';

describe('getTeamMembers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return team members for valid team', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          discord_id: 'user1',
          discord_username: 'TeamLeader',
          guild_role: 'member'
        },
        {
          discord_id: 'user2',
          discord_username: 'TeamMember1',
          guild_role: 'member'
        },
        {
          discord_id: 'user3',
          discord_username: 'TeamMember2',
          guild_role: 'recruit'
        }
      ])
      .returning()
      .execute();

    // Create test team
    const team = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: users[0].id,
        max_members: 5
      })
      .returning()
      .execute();

    // Add team members
    await db.insert(teamMembersTable)
      .values([
        {
          team_id: team[0].id,
          user_id: users[0].id
        },
        {
          team_id: team[0].id,
          user_id: users[1].id
        },
        {
          team_id: team[0].id,
          user_id: users[2].id
        }
      ])
      .execute();

    const input: GetTeamMembersInput = {
      team_id: team[0].id
    };

    const result = await getTeamMembers(input);

    // Should return all three members
    expect(result).toHaveLength(3);

    // Verify structure and data
    result.forEach(member => {
      expect(member.id).toBeDefined();
      expect(member.team_id).toEqual(team[0].id);
      expect(member.user_id).toBeDefined();
      expect(member.joined_at).toBeInstanceOf(Date);
    });

    // Verify user IDs are correct
    const userIds = result.map(m => m.user_id).sort();
    const expectedUserIds = users.map(u => u.id).sort();
    expect(userIds).toEqual(expectedUserIds);
  });

  it('should return empty array for team with no members', async () => {
    // Create test user and team
    const user = await db.insert(usersTable)
      .values({
        discord_id: 'user1',
        discord_username: 'TeamLeader',
        guild_role: 'member'
      })
      .returning()
      .execute();

    const team = await db.insert(teamsTable)
      .values({
        name: 'Empty Team',
        description: 'A team with no members',
        created_by: user[0].id,
        max_members: 5
      })
      .returning()
      .execute();

    const input: GetTeamMembersInput = {
      team_id: team[0].id
    };

    const result = await getTeamMembers(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent team', async () => {
    const input: GetTeamMembersInput = {
      team_id: 99999
    };

    const result = await getTeamMembers(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle team with single member', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        discord_id: 'solo_user',
        discord_username: 'SoloPlayer',
        guild_role: 'senior_guild_member'
      })
      .returning()
      .execute();

    // Create test team
    const team = await db.insert(teamsTable)
      .values({
        name: 'Solo Team',
        description: 'One person team',
        created_by: user[0].id,
        max_members: 1
      })
      .returning()
      .execute();

    // Add single member
    await db.insert(teamMembersTable)
      .values({
        team_id: team[0].id,
        user_id: user[0].id
      })
      .execute();

    const input: GetTeamMembersInput = {
      team_id: team[0].id
    };

    const result = await getTeamMembers(input);

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toEqual(team[0].id);
    expect(result[0].user_id).toEqual(user[0].id);
    expect(result[0].joined_at).toBeInstanceOf(Date);
  });

  it('should verify members are saved correctly in database', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        discord_id: 'test_user',
        discord_username: 'TestUser',
        guild_role: 'member'
      })
      .returning()
      .execute();

    // Create test team
    const team = await db.insert(teamsTable)
      .values({
        name: 'Database Test Team',
        description: 'Testing database consistency',
        created_by: user[0].id,
        max_members: 3
      })
      .returning()
      .execute();

    // Add team member
    await db.insert(teamMembersTable)
      .values({
        team_id: team[0].id,
        user_id: user[0].id
      })
      .execute();

    const input: GetTeamMembersInput = {
      team_id: team[0].id
    };

    // Get members using handler
    const handlerResult = await getTeamMembers(input);

    // Verify against direct database query
    const dbResult = await db.select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.team_id, team[0].id))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbResult).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(dbResult[0].id);
    expect(handlerResult[0].team_id).toEqual(dbResult[0].team_id);
    expect(handlerResult[0].user_id).toEqual(dbResult[0].user_id);
    expect(handlerResult[0].joined_at).toEqual(dbResult[0].joined_at);
  });
});