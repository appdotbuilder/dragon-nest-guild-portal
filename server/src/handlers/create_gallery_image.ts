import { db } from '../db';
import { galleryImagesTable, usersTable } from '../db/schema';
import { type CreateGalleryImageInput, type GalleryImage } from '../schema';
import { eq } from 'drizzle-orm';

export const createGalleryImage = async (input: CreateGalleryImageInput): Promise<GalleryImage> => {
  try {
    // Verify that the uploading user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.uploaded_by))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.uploaded_by} does not exist`);
    }

    // Insert gallery image record
    const result = await db.insert(galleryImagesTable)
      .values({
        title: input.title,
        description: input.description,
        image_url: input.image_url,
        uploaded_by: input.uploaded_by,
        tags: input.tags // JSONB field handles array directly
      })
      .returning()
      .execute();

    const galleryImage = result[0];
    return {
      ...galleryImage,
      tags: galleryImage.tags as string[] // JSONB field returns array directly
    };
  } catch (error) {
    console.error('Gallery image creation failed:', error);
    throw error;
  }
};