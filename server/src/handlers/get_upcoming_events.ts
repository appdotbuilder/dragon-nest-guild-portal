import { db } from '../db';
import { eventsTable, eventRegistrationsTable } from '../db/schema';
import { type Event } from '../schema';
import { eq, sql, and, or } from 'drizzle-orm';

export const getUpcomingEvents = async (): Promise<Event[]> => {
  try {
    // Get upcoming events with registration counts in a single query
    const results = await db.select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      event_date: eventsTable.event_date,
      max_slots: eventsTable.max_slots,
      status: eventsTable.status,
      created_by: eventsTable.created_by,
      created_at: eventsTable.created_at,
      registered_count: sql<string>`COALESCE(COUNT(${eventRegistrationsTable.id}), 0)`
    })
    .from(eventsTable)
    .leftJoin(eventRegistrationsTable, eq(eventsTable.id, eventRegistrationsTable.event_id))
    .where(or(
      eq(eventsTable.status, 'upcoming'),
      eq(eventsTable.status, 'ongoing')
    ))
    .groupBy(
      eventsTable.id,
      eventsTable.title,
      eventsTable.description,
      eventsTable.event_date,
      eventsTable.max_slots,
      eventsTable.status,
      eventsTable.created_by,
      eventsTable.created_at
    )
    .orderBy(eventsTable.event_date)
    .execute();

    // Convert the results to Event objects with available_slots calculated
    return results.map(result => ({
      id: result.id,
      title: result.title,
      description: result.description,
      event_date: result.event_date,
      max_slots: result.max_slots,
      status: result.status,
      created_by: result.created_by,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch upcoming events:', error);
    throw error;
  }
};