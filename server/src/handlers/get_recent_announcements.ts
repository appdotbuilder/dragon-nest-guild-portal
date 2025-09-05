import { db } from '../db';
import { announcementsTable } from '../db/schema';
import { type Announcement } from '../schema';
import { desc } from 'drizzle-orm';

export const getRecentAnnouncements = async (): Promise<Announcement[]> => {
  try {
    // Fetch announcements ordered by creation date (most recent first)
    // Limit to 10 recent announcements for dashboard/general use
    const results = await db.select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.created_at))
      .limit(10)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch recent announcements:', error);
    throw error;
  }
};