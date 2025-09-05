import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembersTable } from '../db/schema';
import { type JoinTeamInput } from '../schema';
import { joinTeam } from '../handlers/join_team';
import { eq, and } from 'drizzle-orm';

describe('joinTeam', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testUser2: any;
  let testTeam: any;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create second test user
    const userResult2 = await db.insert(usersTable)
      .values({
        discord_id: 'test456',
        discord_username: 'testuser2',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    testUser2 = userResult2[0];

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: testUser.id,
        max_members: 3
      })
      .returning()
      .execute();
    testTeam = teamResult[0];
  });

  const testInput: JoinTeamInput = {
    team_id: 1,
    user_id: 1
  };

  it('should successfully join a team', async () => {
    const input: JoinTeamInput = {
      team_id: testTeam.id,
      user_id: testUser2.id
    };

    const result = await joinTeam(input);

    // Basic field validation
    expect(result.team_id).toEqual(testTeam.id);
    expect(result.user_id).toEqual(testUser2.id);
    expect(result.id).toBeDefined();
    expect(result.joined_at).toBeInstanceOf(Date);
  });

  it('should save team membership to database', async () => {
    const input: JoinTeamInput = {
      team_id: testTeam.id,
      user_id: testUser2.id
    };

    const result = await joinTeam(input);

    // Query the database to verify the membership was created
    const memberships = await db.select()
      .from(teamMembersTable)
      .where(and(
        eq(teamMembersTable.team_id, testTeam.id),
        eq(teamMembersTable.user_id, testUser2.id)
      ))
      .execute();

    expect(memberships).toHaveLength(1);
    expect(memberships[0].team_id).toEqual(testTeam.id);
    expect(memberships[0].user_id).toEqual(testUser2.id);
    expect(memberships[0].joined_at).toBeInstanceOf(Date);
  });

  it('should throw error when team does not exist', async () => {
    const input: JoinTeamInput = {
      team_id: 99999,
      user_id: testUser.id
    };

    await expect(joinTeam(input)).rejects.toThrow(/team not found/i);
  });

  it('should throw error when user does not exist', async () => {
    const input: JoinTeamInput = {
      team_id: testTeam.id,
      user_id: 99999
    };

    await expect(joinTeam(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when user is already a team member', async () => {
    const input: JoinTeamInput = {
      team_id: testTeam.id,
      user_id: testUser2.id
    };

    // First join should succeed
    await joinTeam(input);

    // Second join should fail
    await expect(joinTeam(input)).rejects.toThrow(/already a member/i);
  });

  it('should throw error when team is full', async () => {
    // Create a team with max 2 members
    const smallTeamResult = await db.insert(teamsTable)
      .values({
        name: 'Small Team',
        description: 'A small team',
        created_by: testUser.id,
        max_members: 2
      })
      .returning()
      .execute();
    const smallTeam = smallTeamResult[0];

    // Create additional test user
    const userResult3 = await db.insert(usersTable)
      .values({
        discord_id: 'test789',
        discord_username: 'testuser3',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();
    const testUser3 = userResult3[0];

    // Fill the team to capacity
    await joinTeam({
      team_id: smallTeam.id,
      user_id: testUser2.id
    });

    await joinTeam({
      team_id: smallTeam.id,
      user_id: testUser3.id
    });

    // Try to add one more member - should fail
    const input: JoinTeamInput = {
      team_id: smallTeam.id,
      user_id: testUser.id
    };

    await expect(joinTeam(input)).rejects.toThrow(/team is full/i);
  });

  it('should verify team member count increases correctly', async () => {
    // Check initial count
    const initialMembers = await db.select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.team_id, testTeam.id))
      .execute();

    expect(initialMembers).toHaveLength(0);

    // Add first member
    await joinTeam({
      team_id: testTeam.id,
      user_id: testUser2.id
    });

    const afterFirstJoin = await db.select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.team_id, testTeam.id))
      .execute();

    expect(afterFirstJoin).toHaveLength(1);

    // Create and add second member
    const userResult3 = await db.insert(usersTable)
      .values({
        discord_id: 'test789',
        discord_username: 'testuser3',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    await joinTeam({
      team_id: testTeam.id,
      user_id: userResult3[0].id
    });

    const afterSecondJoin = await db.select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.team_id, testTeam.id))
      .execute();

    expect(afterSecondJoin).toHaveLength(2);
  });

  it('should handle team at max capacity boundary correctly', async () => {
    // Create a team with max 1 member
    const soloTeamResult = await db.insert(teamsTable)
      .values({
        name: 'Solo Team',
        description: 'A solo team',
        created_by: testUser.id,
        max_members: 1
      })
      .returning()
      .execute();
    const soloTeam = soloTeamResult[0];

    // First member should join successfully
    await joinTeam({
      team_id: soloTeam.id,
      user_id: testUser2.id
    });

    // Second member should be rejected
    await expect(joinTeam({
      team_id: soloTeam.id,
      user_id: testUser.id
    })).rejects.toThrow(/team is full/i);
  });
});