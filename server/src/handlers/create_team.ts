import { db } from '../db';
import { teamsTable, usersTable } from '../db/schema';
import { type CreateTeamInput, type Team } from '../schema';
import { eq } from 'drizzle-orm';

export const createTeam = async (input: CreateTeamInput): Promise<Team> => {
  try {
    // Verify that the creator exists
    const creator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (creator.length === 0) {
      throw new Error('Creator user not found');
    }

    // Insert team record
    const result = await db.insert(teamsTable)
      .values({
        name: input.name,
        description: input.description,
        created_by: input.created_by,
        max_members: input.max_members
        // discord_channel_id will remain null for now - can be set later via Discord integration
      })
      .returning()
      .execute();

    const team = result[0];
    return {
      ...team,
      created_at: team.created_at
    };
  } catch (error) {
    console.error('Team creation failed:', error);
    throw error;
  }
};