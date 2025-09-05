import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, charactersTable, eventsTable, eventRegistrationsTable } from '../db/schema';
import { type GetEventRegistrationsInput } from '../schema';
import { getEventRegistrations } from '../handlers/get_event_registrations';

// Test data
const testUser = {
  discord_id: '123456789012345678',
  discord_username: 'testuser',
  discord_avatar: 'avatar_hash',
  guild_role: 'member' as const
};

const testCharacter = {
  ign: 'TestChar',
  job: 'gladiator' as const,
  stats_screenshot_url: 'https://example.com/stats.png'
};

const testEvent = {
  title: 'Test Raid Event',
  description: 'A test raid event for guild members',
  event_date: new Date('2024-12-25T20:00:00Z'),
  max_slots: 10
};

describe('getEventRegistrations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return registrations for a specific event', async () => {
    // Create prerequisite data
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResults[0].id;

    const characterResults = await db.insert(charactersTable)
      .values({
        ...testCharacter,
        user_id: userId
      })
      .returning()
      .execute();
    const characterId = characterResults[0].id;

    const eventResults = await db.insert(eventsTable)
      .values({
        ...testEvent,
        created_by: userId
      })
      .returning()
      .execute();
    const eventId = eventResults[0].id;

    // Create event registration
    const registrationResults = await db.insert(eventRegistrationsTable)
      .values({
        event_id: eventId,
        user_id: userId,
        character_id: characterId
      })
      .returning()
      .execute();

    // Test the handler
    const input: GetEventRegistrationsInput = {
      event_id: eventId
    };

    const result = await getEventRegistrations(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(registrationResults[0].id);
    expect(result[0].event_id).toEqual(eventId);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].character_id).toEqual(characterId);
    expect(result[0].registered_at).toBeInstanceOf(Date);
  });

  it('should return multiple registrations for an event', async () => {
    // Create first user and character
    const user1Results = await db.insert(usersTable)
      .values({
        ...testUser,
        discord_id: '123456789012345671'
      })
      .returning()
      .execute();
    const user1Id = user1Results[0].id;

    const character1Results = await db.insert(charactersTable)
      .values({
        ...testCharacter,
        user_id: user1Id,
        ign: 'TestChar1'
      })
      .returning()
      .execute();
    const character1Id = character1Results[0].id;

    // Create second user and character
    const user2Results = await db.insert(usersTable)
      .values({
        ...testUser,
        discord_id: '123456789012345672',
        discord_username: 'testuser2'
      })
      .returning()
      .execute();
    const user2Id = user2Results[0].id;

    const character2Results = await db.insert(charactersTable)
      .values({
        ...testCharacter,
        user_id: user2Id,
        ign: 'TestChar2',
        job: 'crusader' as const
      })
      .returning()
      .execute();
    const character2Id = character2Results[0].id;

    // Create event
    const eventResults = await db.insert(eventsTable)
      .values({
        ...testEvent,
        created_by: user1Id
      })
      .returning()
      .execute();
    const eventId = eventResults[0].id;

    // Create two event registrations
    await db.insert(eventRegistrationsTable)
      .values([
        {
          event_id: eventId,
          user_id: user1Id,
          character_id: character1Id
        },
        {
          event_id: eventId,
          user_id: user2Id,
          character_id: character2Id
        }
      ])
      .execute();

    // Test the handler
    const input: GetEventRegistrationsInput = {
      event_id: eventId
    };

    const result = await getEventRegistrations(input);

    expect(result).toHaveLength(2);
    
    // Verify all registrations belong to the correct event
    result.forEach(registration => {
      expect(registration.event_id).toEqual(eventId);
      expect(registration.registered_at).toBeInstanceOf(Date);
      expect([user1Id, user2Id]).toContain(registration.user_id);
      expect([character1Id, character2Id]).toContain(registration.character_id);
    });
  });

  it('should return empty array for event with no registrations', async () => {
    // Create user and event but no registrations
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResults[0].id;

    const eventResults = await db.insert(eventsTable)
      .values({
        ...testEvent,
        created_by: userId
      })
      .returning()
      .execute();
    const eventId = eventResults[0].id;

    // Test the handler
    const input: GetEventRegistrationsInput = {
      event_id: eventId
    };

    const result = await getEventRegistrations(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent event', async () => {
    const input: GetEventRegistrationsInput = {
      event_id: 999999
    };

    const result = await getEventRegistrations(input);

    expect(result).toHaveLength(0);
  });

  it('should only return registrations for the specified event', async () => {
    // Create user and character
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResults[0].id;

    const characterResults = await db.insert(charactersTable)
      .values({
        ...testCharacter,
        user_id: userId
      })
      .returning()
      .execute();
    const characterId = characterResults[0].id;

    // Create two events
    const event1Results = await db.insert(eventsTable)
      .values({
        ...testEvent,
        created_by: userId,
        title: 'Event 1'
      })
      .returning()
      .execute();
    const event1Id = event1Results[0].id;

    const event2Results = await db.insert(eventsTable)
      .values({
        ...testEvent,
        created_by: userId,
        title: 'Event 2'
      })
      .returning()
      .execute();
    const event2Id = event2Results[0].id;

    // Create registrations for both events
    await db.insert(eventRegistrationsTable)
      .values([
        {
          event_id: event1Id,
          user_id: userId,
          character_id: characterId
        },
        {
          event_id: event2Id,
          user_id: userId,
          character_id: characterId
        }
      ])
      .execute();

    // Test the handler for event 1
    const input: GetEventRegistrationsInput = {
      event_id: event1Id
    };

    const result = await getEventRegistrations(input);

    expect(result).toHaveLength(1);
    expect(result[0].event_id).toEqual(event1Id);
  });
});