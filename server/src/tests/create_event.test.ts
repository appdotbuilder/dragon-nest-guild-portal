import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable, usersTable } from '../db/schema';
import { type CreateEventInput } from '../schema';
import { createEvent } from '../handlers/create_event';
import { eq } from 'drizzle-orm';

describe('createEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test user first for foreign key requirement
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '12345',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'guild_master'
      })
      .returning()
      .execute();
    return userResult[0];
  };

  const testInput: CreateEventInput = {
    title: 'Guild Raid Night',
    description: 'Weekly guild raid event for all members',
    event_date: new Date('2024-02-15T20:00:00Z'),
    max_slots: 20,
    created_by: 1
  };

  it('should create an event successfully', async () => {
    const user = await createTestUser();
    const input = { ...testInput, created_by: user.id };

    const result = await createEvent(input);

    // Basic field validation
    expect(result.title).toEqual('Guild Raid Night');
    expect(result.description).toEqual('Weekly guild raid event for all members');
    expect(result.event_date).toEqual(new Date('2024-02-15T20:00:00Z'));
    expect(result.max_slots).toEqual(20);
    expect(result.status).toEqual('upcoming');
    expect(result.created_by).toEqual(user.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save event to database', async () => {
    const user = await createTestUser();
    const input = { ...testInput, created_by: user.id };

    const result = await createEvent(input);

    // Verify event was saved to database
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, result.id))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Guild Raid Night');
    expect(events[0].description).toEqual('Weekly guild raid event for all members');
    expect(events[0].event_date).toEqual(new Date('2024-02-15T20:00:00Z'));
    expect(events[0].max_slots).toEqual(20);
    expect(events[0].status).toEqual('upcoming');
    expect(events[0].created_by).toEqual(user.id);
    expect(events[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle future event dates correctly', async () => {
    const user = await createTestUser();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    const input = {
      ...testInput,
      created_by: user.id,
      event_date: futureDate
    };

    const result = await createEvent(input);

    expect(result.event_date).toEqual(futureDate);
    expect(result.status).toEqual('upcoming');
  });

  it('should create events with different max slots', async () => {
    const user = await createTestUser();
    const input = {
      ...testInput,
      created_by: user.id,
      max_slots: 50
    };

    const result = await createEvent(input);

    expect(result.max_slots).toEqual(50);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInput, created_by: 999 };

    expect(createEvent(input)).rejects.toThrow(/user not found/i);
  });

  it('should create multiple events by same user', async () => {
    const user = await createTestUser();

    const event1Input = {
      ...testInput,
      created_by: user.id,
      title: 'First Event'
    };

    const event2Input = {
      ...testInput,
      created_by: user.id,
      title: 'Second Event',
      event_date: new Date('2024-02-20T18:00:00Z')
    };

    const result1 = await createEvent(event1Input);
    const result2 = await createEvent(event2Input);

    expect(result1.title).toEqual('First Event');
    expect(result2.title).toEqual('Second Event');
    expect(result1.created_by).toEqual(user.id);
    expect(result2.created_by).toEqual(user.id);
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should handle long event descriptions', async () => {
    const user = await createTestUser();
    const longDescription = 'A'.repeat(1000);
    
    const input = {
      ...testInput,
      created_by: user.id,
      description: longDescription
    };

    const result = await createEvent(input);

    expect(result.description).toEqual(longDescription);
  });

  it('should set correct default status', async () => {
    const user = await createTestUser();
    const input = { ...testInput, created_by: user.id };

    const result = await createEvent(input);

    expect(result.status).toEqual('upcoming');
  });
});