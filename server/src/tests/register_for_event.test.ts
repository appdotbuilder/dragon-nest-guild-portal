import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, charactersTable, eventsTable, eventRegistrationsTable } from '../db/schema';
import { type RegisterForEventInput } from '../schema';
import { registerForEvent } from '../handlers/register_for_event';
import { eq } from 'drizzle-orm';

describe('registerForEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register user for event successfully', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        discord_id: 'test_user_123',
        discord_username: 'TestUser',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({
        user_id: user[0].id,
        ign: 'TestCharacter',
        job: 'gladiator',
        stats_screenshot_url: 'https://example.com/stats.png'
      })
      .returning()
      .execute();

    const event = await db.insert(eventsTable)
      .values({
        title: 'Test Event',
        description: 'A test event',
        event_date: new Date('2024-12-31T18:00:00Z'),
        max_slots: 10,
        status: 'upcoming',
        created_by: user[0].id
      })
      .returning()
      .execute();

    const input: RegisterForEventInput = {
      event_id: event[0].id,
      user_id: user[0].id,
      character_id: character[0].id
    };

    const result = await registerForEvent(input);

    // Verify registration details
    expect(result.event_id).toEqual(event[0].id);
    expect(result.user_id).toEqual(user[0].id);
    expect(result.character_id).toEqual(character[0].id);
    expect(result.id).toBeDefined();
    expect(result.registered_at).toBeInstanceOf(Date);
  });

  it('should save registration to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        discord_id: 'test_user_456',
        discord_username: 'TestUser2',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({
        user_id: user[0].id,
        ign: 'TestChar2',
        job: 'moonlord',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const event = await db.insert(eventsTable)
      .values({
        title: 'Database Test Event',
        description: 'Testing database persistence',
        event_date: new Date('2024-12-25T20:00:00Z'),
        max_slots: 5,
        status: 'upcoming',
        created_by: user[0].id
      })
      .returning()
      .execute();

    const input: RegisterForEventInput = {
      event_id: event[0].id,
      user_id: user[0].id,
      character_id: character[0].id
    };

    const result = await registerForEvent(input);

    // Verify data was saved to database
    const registrations = await db.select()
      .from(eventRegistrationsTable)
      .where(eq(eventRegistrationsTable.id, result.id))
      .execute();

    expect(registrations).toHaveLength(1);
    expect(registrations[0].event_id).toEqual(event[0].id);
    expect(registrations[0].user_id).toEqual(user[0].id);
    expect(registrations[0].character_id).toEqual(character[0].id);
    expect(registrations[0].registered_at).toBeInstanceOf(Date);
  });

  it('should throw error when event does not exist', async () => {
    // Create user and character but no event
    const user = await db.insert(usersTable)
      .values({
        discord_id: 'test_user_789',
        discord_username: 'TestUser3',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({
        user_id: user[0].id,
        ign: 'TestChar3',
        job: 'guardian',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const input: RegisterForEventInput = {
      event_id: 99999, // Non-existent event
      user_id: user[0].id,
      character_id: character[0].id
    };

    await expect(registerForEvent(input)).rejects.toThrow(/Event with ID 99999 not found/i);
  });

  it('should throw error when user does not exist', async () => {
    // Create event but no user
    const tempUser = await db.insert(usersTable)
      .values({
        discord_id: 'temp_user',
        discord_username: 'TempUser',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const event = await db.insert(eventsTable)
      .values({
        title: 'No User Event',
        description: 'Testing missing user',
        event_date: new Date('2024-11-30T15:00:00Z'),
        max_slots: 8,
        status: 'upcoming',
        created_by: tempUser[0].id
      })
      .returning()
      .execute();

    const input: RegisterForEventInput = {
      event_id: event[0].id,
      user_id: 88888, // Non-existent user
      character_id: 1
    };

    await expect(registerForEvent(input)).rejects.toThrow(/User with ID 88888 not found/i);
  });

  it('should throw error when character does not exist or does not belong to user', async () => {
    // Create two users and event
    const user1 = await db.insert(usersTable)
      .values({
        discord_id: 'user1_discord',
        discord_username: 'User1',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        discord_id: 'user2_discord',
        discord_username: 'User2',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const character = await db.insert(charactersTable)
      .values({
        user_id: user2[0].id, // Character belongs to user2
        ign: 'User2Character',
        job: 'sniper',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const event = await db.insert(eventsTable)
      .values({
        title: 'Character Ownership Test',
        description: 'Testing character ownership validation',
        event_date: new Date('2024-10-15T12:00:00Z'),
        max_slots: 6,
        status: 'upcoming',
        created_by: user1[0].id
      })
      .returning()
      .execute();

    const input: RegisterForEventInput = {
      event_id: event[0].id,
      user_id: user1[0].id, // User1 trying to use User2's character
      character_id: character[0].id
    };

    await expect(registerForEvent(input)).rejects.toThrow(/Character with ID \d+ not found or does not belong to user/i);
  });

  it('should throw error when user is already registered for event', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        discord_id: 'duplicate_user',
        discord_username: 'DuplicateUser',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const character1 = await db.insert(charactersTable)
      .values({
        user_id: user[0].id,
        ign: 'FirstChar',
        job: 'crusader',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const character2 = await db.insert(charactersTable)
      .values({
        user_id: user[0].id,
        ign: 'SecondChar',
        job: 'saint',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const event = await db.insert(eventsTable)
      .values({
        title: 'Duplicate Registration Test',
        description: 'Testing duplicate registration prevention',
        event_date: new Date('2024-09-20T19:00:00Z'),
        max_slots: 12,
        status: 'upcoming',
        created_by: user[0].id
      })
      .returning()
      .execute();

    // First registration should succeed
    const firstInput: RegisterForEventInput = {
      event_id: event[0].id,
      user_id: user[0].id,
      character_id: character1[0].id
    };

    await registerForEvent(firstInput);

    // Second registration with different character should fail
    const secondInput: RegisterForEventInput = {
      event_id: event[0].id,
      user_id: user[0].id,
      character_id: character2[0].id
    };

    await expect(registerForEvent(secondInput)).rejects.toThrow(/User \d+ is already registered for event \d+/i);
  });

  it('should throw error when event is full', async () => {
    // Create event with limited slots
    const creator = await db.insert(usersTable)
      .values({
        discord_id: 'event_creator',
        discord_username: 'EventCreator',
        discord_avatar: null,
        guild_role: 'guild_master',
        treasury_status: 'exempt'
      })
      .returning()
      .execute();

    const event = await db.insert(eventsTable)
      .values({
        title: 'Full Event Test',
        description: 'Testing event capacity limits',
        event_date: new Date('2024-08-10T16:00:00Z'),
        max_slots: 2, // Very limited slots
        status: 'upcoming',
        created_by: creator[0].id
      })
      .returning()
      .execute();

    // Fill up the event
    for (let i = 1; i <= 2; i++) {
      const user = await db.insert(usersTable)
        .values({
          discord_id: `full_test_user_${i}`,
          discord_username: `FullTestUser${i}`,
          discord_avatar: null,
          guild_role: 'member',
          treasury_status: 'paid'
        })
        .returning()
        .execute();

      const character = await db.insert(charactersTable)
        .values({
          user_id: user[0].id,
          ign: `FullTestChar${i}`,
          job: 'artillery',
          stats_screenshot_url: null
        })
        .returning()
        .execute();

      await registerForEvent({
        event_id: event[0].id,
        user_id: user[0].id,
        character_id: character[0].id
      });
    }

    // Try to register one more user (should fail)
    const extraUser = await db.insert(usersTable)
      .values({
        discord_id: 'extra_user',
        discord_username: 'ExtraUser',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const extraCharacter = await db.insert(charactersTable)
      .values({
        user_id: extraUser[0].id,
        ign: 'ExtraChar',
        job: 'tempest',
        stats_screenshot_url: null
      })
      .returning()
      .execute();

    const input: RegisterForEventInput = {
      event_id: event[0].id,
      user_id: extraUser[0].id,
      character_id: extraCharacter[0].id
    };

    await expect(registerForEvent(input)).rejects.toThrow(/Event \d+ is full \(2\/2 slots\)/i);
  });
});