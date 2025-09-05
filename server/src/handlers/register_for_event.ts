import { db } from '../db';
import { eventsTable, eventRegistrationsTable, usersTable, charactersTable } from '../db/schema';
import { type RegisterForEventInput, type EventRegistration } from '../schema';
import { eq, and, count } from 'drizzle-orm';

export const registerForEvent = async (input: RegisterForEventInput): Promise<EventRegistration> => {
  try {
    // Validate event exists and get event details
    const event = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, input.event_id))
      .execute();

    if (event.length === 0) {
      throw new Error(`Event with ID ${input.event_id} not found`);
    }

    // Validate user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Validate character exists and belongs to the user
    const character = await db.select()
      .from(charactersTable)
      .where(
        and(
          eq(charactersTable.id, input.character_id),
          eq(charactersTable.user_id, input.user_id)
        )
      )
      .execute();

    if (character.length === 0) {
      throw new Error(`Character with ID ${input.character_id} not found or does not belong to user ${input.user_id}`);
    }

    // Check if user is already registered for this event
    const existingRegistration = await db.select()
      .from(eventRegistrationsTable)
      .where(
        and(
          eq(eventRegistrationsTable.event_id, input.event_id),
          eq(eventRegistrationsTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingRegistration.length > 0) {
      throw new Error(`User ${input.user_id} is already registered for event ${input.event_id}`);
    }

    // Check if event has available slots
    const registrationCount = await db.select({ count: count() })
      .from(eventRegistrationsTable)
      .where(eq(eventRegistrationsTable.event_id, input.event_id))
      .execute();

    const currentRegistrations = registrationCount[0].count;
    const maxSlots = event[0].max_slots;

    if (currentRegistrations >= maxSlots) {
      throw new Error(`Event ${input.event_id} is full (${currentRegistrations}/${maxSlots} slots)`);
    }

    // Register user for event
    const result = await db.insert(eventRegistrationsTable)
      .values({
        event_id: input.event_id,
        user_id: input.user_id,
        character_id: input.character_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Event registration failed:', error);
    throw error;
  }
};