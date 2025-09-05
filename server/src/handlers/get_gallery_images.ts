import { db } from '../db';
import { galleryImagesTable } from '../db/schema';
import { type GalleryImage, type GetPaginatedInput } from '../schema';
import { desc } from 'drizzle-orm';

export const getGalleryImages = async (input: GetPaginatedInput): Promise<GalleryImage[]> => {
  try {
    // Calculate offset based on pagination
    const offset = (input.page - 1) * input.limit;
    
    // Build and execute query with pagination and ordering
    const results = await db.select()
      .from(galleryImagesTable)
      .orderBy(desc(galleryImagesTable.created_at))
      .limit(input.limit)
      .offset(offset)
      .execute();

    // Return results with proper type conversion
    return results.map(image => ({
      ...image,
      tags: Array.isArray(image.tags) ? image.tags : []
    }));
  } catch (error) {
    console.error('Failed to fetch gallery images:', error);
    throw error;
  }
};