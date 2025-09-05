import { db } from '../db';
import { eventsTable, usersTable } from '../db/schema';
import { type CreateEventInput, type Event } from '../schema';
import { eq } from 'drizzle-orm';

export const createEvent = async (input: CreateEventInput): Promise<Event> => {
  try {
    // Verify that the creating user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (!user.length) {
      throw new Error('User not found');
    }

    // Insert event record
    const result = await db.insert(eventsTable)
      .values({
        title: input.title,
        description: input.description,
        event_date: input.event_date,
        max_slots: input.max_slots,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Event creation failed:', error);
    throw error;
  }
};