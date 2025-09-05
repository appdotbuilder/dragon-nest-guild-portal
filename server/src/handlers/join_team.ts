import { db } from '../db';
import { teamsTable, teamMembersTable, usersTable } from '../db/schema';
import { type JoinTeamInput, type TeamMember } from '../schema';
import { eq, and, count } from 'drizzle-orm';

export const joinTeam = async (input: JoinTeamInput): Promise<TeamMember> => {
  try {
    // Check if team exists
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, input.team_id))
      .execute();

    if (team.length === 0) {
      throw new Error('Team not found');
    }

    // Check if user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Check if user is already a member of this team
    const existingMembership = await db.select()
      .from(teamMembersTable)
      .where(and(
        eq(teamMembersTable.team_id, input.team_id),
        eq(teamMembersTable.user_id, input.user_id)
      ))
      .execute();

    if (existingMembership.length > 0) {
      throw new Error('User is already a member of this team');
    }

    // Check if team has available slots
    const memberCountResult = await db.select({
      count: count()
    })
      .from(teamMembersTable)
      .where(eq(teamMembersTable.team_id, input.team_id))
      .execute();

    const currentMemberCount = memberCountResult[0].count;
    const maxMembers = team[0].max_members;

    if (currentMemberCount >= maxMembers) {
      throw new Error('Team is full');
    }

    // Add user to team
    const result = await db.insert(teamMembersTable)
      .values({
        team_id: input.team_id,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Join team failed:', error);
    throw error;
  }
};