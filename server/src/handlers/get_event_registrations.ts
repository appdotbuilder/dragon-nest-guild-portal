import { db } from '../db';
import { eventRegistrationsTable, usersTable, charactersTable } from '../db/schema';
import { type GetEventRegistrationsInput, type EventRegistration } from '../schema';
import { eq } from 'drizzle-orm';

export const getEventRegistrations = async (input: GetEventRegistrationsInput): Promise<EventRegistration[]> => {
  try {
    // Query event registrations with joined user and character data
    const results = await db.select({
      id: eventRegistrationsTable.id,
      event_id: eventRegistrationsTable.event_id,
      user_id: eventRegistrationsTable.user_id,
      character_id: eventRegistrationsTable.character_id,
      registered_at: eventRegistrationsTable.registered_at
    })
    .from(eventRegistrationsTable)
    .innerJoin(usersTable, eq(eventRegistrationsTable.user_id, usersTable.id))
    .innerJoin(charactersTable, eq(eventRegistrationsTable.character_id, charactersTable.id))
    .where(eq(eventRegistrationsTable.event_id, input.event_id))
    .execute();

    // Return the event registrations
    return results.map(result => ({
      id: result.id,
      event_id: result.event_id,
      user_id: result.user_id,
      character_id: result.character_id,
      registered_at: result.registered_at
    }));
  } catch (error) {
    console.error('Failed to fetch event registrations:', error);
    throw error;
  }
};