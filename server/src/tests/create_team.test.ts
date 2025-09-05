import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { teamsTable, usersTable } from '../db/schema';
import { type CreateTeamInput } from '../schema';
import { createTeam } from '../handlers/create_team';
import { eq } from 'drizzle-orm';

// Test user for creating teams
const testUser = {
  discord_id: 'test_discord_123',
  discord_username: 'TestUser',
  discord_avatar: null,
  guild_role: 'guild_master' as const
};

// Basic test input
const testTeamInput: CreateTeamInput = {
  name: 'Test Team',
  description: 'A team for testing purposes',
  created_by: 1, // Will be set to actual user ID in tests
  max_members: 5
};

describe('createTeam', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a team with valid input', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testTeamInput, created_by: userId };

    const result = await createTeam(input);

    // Verify basic fields
    expect(result.name).toEqual('Test Team');
    expect(result.description).toEqual('A team for testing purposes');
    expect(result.created_by).toEqual(userId);
    expect(result.max_members).toEqual(5);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.discord_channel_id).toBeNull();
  });

  it('should save team to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testTeamInput, created_by: userId };

    const result = await createTeam(input);

    // Query database to verify team was saved
    const teams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, result.id))
      .execute();

    expect(teams).toHaveLength(1);
    expect(teams[0].name).toEqual('Test Team');
    expect(teams[0].description).toEqual('A team for testing purposes');
    expect(teams[0].created_by).toEqual(userId);
    expect(teams[0].max_members).toEqual(5);
    expect(teams[0].created_at).toBeInstanceOf(Date);
    expect(teams[0].discord_channel_id).toBeNull();
  });

  it('should create team with null description', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input: CreateTeamInput = {
      name: 'Team Without Description',
      description: null,
      created_by: userId,
      max_members: 10
    };

    const result = await createTeam(input);

    expect(result.name).toEqual('Team Without Description');
    expect(result.description).toBeNull();
    expect(result.max_members).toEqual(10);
    expect(result.id).toBeDefined();
  });

  it('should create team with maximum members limit', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input: CreateTeamInput = {
      name: 'Large Team',
      description: 'Team with max members',
      created_by: userId,
      max_members: 20
    };

    const result = await createTeam(input);

    expect(result.name).toEqual('Large Team');
    expect(result.max_members).toEqual(20);
    expect(result.id).toBeDefined();

    // Verify in database
    const teams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, result.id))
      .execute();

    expect(teams[0].max_members).toEqual(20);
  });

  it('should throw error when creator user does not exist', async () => {
    const input: CreateTeamInput = {
      name: 'Invalid Team',
      description: 'Team with non-existent creator',
      created_by: 999, // Non-existent user ID
      max_members: 5
    };

    await expect(createTeam(input)).rejects.toThrow(/creator user not found/i);
  });

  it('should create multiple teams with different names', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const team1Input: CreateTeamInput = {
      name: 'Team Alpha',
      description: 'First team',
      created_by: userId,
      max_members: 4
    };

    const team2Input: CreateTeamInput = {
      name: 'Team Beta',
      description: 'Second team',
      created_by: userId,
      max_members: 6
    };

    const result1 = await createTeam(team1Input);
    const result2 = await createTeam(team2Input);

    expect(result1.name).toEqual('Team Alpha');
    expect(result1.max_members).toEqual(4);
    expect(result2.name).toEqual('Team Beta');
    expect(result2.max_members).toEqual(6);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both teams exist in database
    const teams = await db.select()
      .from(teamsTable)
      .execute();

    expect(teams).toHaveLength(2);
  });

  it('should handle teams created by different users', async () => {
    // Create two prerequisite users
    const user1Result = await db.insert(usersTable)
      .values({
        ...testUser,
        discord_id: 'user1_discord',
        discord_username: 'User1'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        discord_id: 'user2_discord',
        discord_username: 'User2'
      })
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    const team1Input: CreateTeamInput = {
      name: 'User1 Team',
      description: 'Team created by user 1',
      created_by: user1Id,
      max_members: 3
    };

    const team2Input: CreateTeamInput = {
      name: 'User2 Team',
      description: 'Team created by user 2',
      created_by: user2Id,
      max_members: 7
    };

    const result1 = await createTeam(team1Input);
    const result2 = await createTeam(team2Input);

    expect(result1.created_by).toEqual(user1Id);
    expect(result2.created_by).toEqual(user2Id);
    expect(result1.name).toEqual('User1 Team');
    expect(result2.name).toEqual('User2 Team');
  });
});