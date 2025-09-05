import { db } from '../db';
import { teamsTable, teamMembersTable, usersTable } from '../db/schema';
import { type Team } from '../schema';
import { count, eq } from 'drizzle-orm';

export const getAllTeams = async (): Promise<Team[]> => {
  try {
    // Get all teams with member count using a subquery approach
    const teamsWithMemberCount = await db
      .select({
        id: teamsTable.id,
        name: teamsTable.name,
        description: teamsTable.description,
        created_by: teamsTable.created_by,
        discord_channel_id: teamsTable.discord_channel_id,
        max_members: teamsTable.max_members,
        created_at: teamsTable.created_at,
        member_count: count(teamMembersTable.id)
      })
      .from(teamsTable)
      .leftJoin(teamMembersTable, eq(teamsTable.id, teamMembersTable.team_id))
      .groupBy(
        teamsTable.id,
        teamsTable.name,
        teamsTable.description,
        teamsTable.created_by,
        teamsTable.discord_channel_id,
        teamsTable.max_members,
        teamsTable.created_at
      )
      .orderBy(teamsTable.created_at)
      .execute();

    // Transform the results to match the Team schema
    // Note: member_count is not part of the Team schema, so we only return Team fields
    return teamsWithMemberCount.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      created_by: team.created_by,
      discord_channel_id: team.discord_channel_id,
      max_members: team.max_members,
      created_at: team.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    throw error;
  }
};