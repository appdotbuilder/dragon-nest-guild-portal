import { db } from '../db';
import { announcementsTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateAnnouncementInput, type Announcement } from '../schema';

export const createAnnouncement = async (input: CreateAnnouncementInput): Promise<Announcement> => {
  try {
    // Verify that the creator exists
    const creator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (creator.length === 0) {
      throw new Error('Creator user does not exist');
    }

    // Insert announcement record
    const result = await db.insert(announcementsTable)
      .values({
        title: input.title,
        content: input.content,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Announcement creation failed:', error);
    throw error;
  }
};