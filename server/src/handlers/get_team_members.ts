import { db } from '../db';
import { teamMembersTable, usersTable } from '../db/schema';
import { type GetTeamMembersInput, type TeamMember } from '../schema';
import { eq } from 'drizzle-orm';

export const getTeamMembers = async (input: GetTeamMembersInput): Promise<TeamMember[]> => {
  try {
    // Query team members with user information
    const results = await db.select()
      .from(teamMembersTable)
      .innerJoin(usersTable, eq(teamMembersTable.user_id, usersTable.id))
      .where(eq(teamMembersTable.team_id, input.team_id))
      .execute();

    // Transform the joined results to match TeamMember schema
    return results.map(result => ({
      id: result.team_members.id,
      team_id: result.team_members.team_id,
      user_id: result.team_members.user_id,
      joined_at: result.team_members.joined_at
    }));
  } catch (error) {
    console.error('Get team members failed:', error);
    throw error;
  }
};