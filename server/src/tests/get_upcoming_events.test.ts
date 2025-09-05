import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable, eventRegistrationsTable, charactersTable } from '../db/schema';
import { getUpcomingEvents } from '../handlers/get_upcoming_events';

describe('getUpcomingEvents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no events exist', async () => {
    const result = await getUpcomingEvents();
    expect(result).toEqual([]);
  });

  it('should return upcoming events ordered by event date', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '12345',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test events with different dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(eventsTable)
      .values([
        {
          title: 'Event Next Week',
          description: 'Event happening next week',
          event_date: nextWeek,
          max_slots: 10,
          status: 'upcoming',
          created_by: userId
        },
        {
          title: 'Event Tomorrow',
          description: 'Event happening tomorrow',
          event_date: tomorrow,
          max_slots: 5,
          status: 'upcoming',
          created_by: userId
        },
        {
          title: 'Past Event',
          description: 'Event that already happened',
          event_date: yesterday,
          max_slots: 8,
          status: 'completed',
          created_by: userId
        }
      ])
      .execute();

    const result = await getUpcomingEvents();

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Event Tomorrow');
    expect(result[1].title).toEqual('Event Next Week');
    
    // Verify all fields are present
    result.forEach(event => {
      expect(event.id).toBeDefined();
      expect(event.title).toBeDefined();
      expect(event.description).toBeDefined();
      expect(event.event_date).toBeInstanceOf(Date);
      expect(event.max_slots).toBeGreaterThan(0);
      expect(event.status).toBeDefined();
      expect(event.created_by).toBeDefined();
      expect(event.created_at).toBeInstanceOf(Date);
    });
  });

  it('should include ongoing events', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '12345',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create ongoing event
    const now = new Date();
    await db.insert(eventsTable)
      .values({
        title: 'Ongoing Event',
        description: 'Event currently happening',
        event_date: now,
        max_slots: 12,
        status: 'ongoing',
        created_by: userId
      })
      .execute();

    const result = await getUpcomingEvents();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Ongoing Event');
    expect(result[0].status).toEqual('ongoing');
  });

  it('should exclude completed and cancelled events', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '12345',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 1);

    await db.insert(eventsTable)
      .values([
        {
          title: 'Completed Event',
          description: 'Event that is completed',
          event_date: eventDate,
          max_slots: 10,
          status: 'completed',
          created_by: userId
        },
        {
          title: 'Cancelled Event',
          description: 'Event that was cancelled',
          event_date: eventDate,
          max_slots: 8,
          status: 'cancelled',
          created_by: userId
        },
        {
          title: 'Upcoming Event',
          description: 'Event that is upcoming',
          event_date: eventDate,
          max_slots: 15,
          status: 'upcoming',
          created_by: userId
        }
      ])
      .execute();

    const result = await getUpcomingEvents();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Upcoming Event');
    expect(result[0].status).toEqual('upcoming');
  });

  it('should work correctly with events that have registrations', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '12345',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create character for registration
    const characterResult = await db.insert(charactersTable)
      .values({
        user_id: userId,
        ign: 'TestCharacter',
        job: 'gladiator',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const characterId = characterResult[0].id;

    // Create event
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 1);

    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Event With Registrations',
        description: 'Event that has registrations',
        event_date: eventDate,
        max_slots: 10,
        status: 'upcoming',
        created_by: userId
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create registrations
    await db.insert(eventRegistrationsTable)
      .values([
        {
          event_id: eventId,
          user_id: userId,
          character_id: characterId
        }
      ])
      .execute();

    const result = await getUpcomingEvents();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Event With Registrations');
    expect(result[0].max_slots).toEqual(10);
  });

  it('should handle multiple events with mixed statuses and registrations', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        discord_id: '12345',
        discord_username: 'testuser1',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        discord_id: '67890',
        discord_username: 'testuser2',
        discord_avatar: null,
        guild_role: 'member'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create characters
    const char1Result = await db.insert(charactersTable)
      .values({
        user_id: user1Id,
        ign: 'Character1',
        job: 'gladiator',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const char2Result = await db.insert(charactersTable)
      .values({
        user_id: user2Id,
        ign: 'Character2',
        job: 'guardian',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    // Create multiple events
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const eventsResult = await db.insert(eventsTable)
      .values([
        {
          title: 'Full Event',
          description: 'Event with max registrations',
          event_date: tomorrow,
          max_slots: 2,
          status: 'upcoming',
          created_by: user1Id
        },
        {
          title: 'Partial Event',
          description: 'Event with some registrations',
          event_date: dayAfterTomorrow,
          max_slots: 5,
          status: 'ongoing',
          created_by: user2Id
        }
      ])
      .returning()
      .execute();

    // Add registrations
    await db.insert(eventRegistrationsTable)
      .values([
        {
          event_id: eventsResult[0].id,
          user_id: user1Id,
          character_id: char1Result[0].id
        },
        {
          event_id: eventsResult[0].id,
          user_id: user2Id,
          character_id: char2Result[0].id
        },
        {
          event_id: eventsResult[1].id,
          user_id: user1Id,
          character_id: char1Result[0].id
        }
      ])
      .execute();

    const result = await getUpcomingEvents();

    expect(result).toHaveLength(2);
    
    // Events should be ordered by date
    expect(result[0].title).toEqual('Full Event');
    expect(result[0].max_slots).toEqual(2);
    
    expect(result[1].title).toEqual('Partial Event');
    expect(result[1].max_slots).toEqual(5);
  });
});