import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { galleryImagesTable, usersTable } from '../db/schema';
import { type CreateGalleryImageInput } from '../schema';
import { createGalleryImage } from '../handlers/create_gallery_image';
import { eq } from 'drizzle-orm';

describe('createGalleryImage', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user for gallery image uploads
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: '123456789',
        discord_username: 'testuser',
        discord_avatar: 'avatar_url',
        guild_role: 'member'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a gallery image with all fields', async () => {
    const testInput: CreateGalleryImageInput = {
      title: 'Epic Dragon Fight',
      description: 'Amazing screenshot from our guild raid',
      image_url: 'https://example.com/image.jpg',
      uploaded_by: testUserId,
      tags: ['dragon', 'raid', 'guild', 'screenshot']
    };

    const result = await createGalleryImage(testInput);

    // Basic field validation
    expect(result.title).toEqual('Epic Dragon Fight');
    expect(result.description).toEqual('Amazing screenshot from our guild raid');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.uploaded_by).toEqual(testUserId);
    expect(result.tags).toEqual(['dragon', 'raid', 'guild', 'screenshot']);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a gallery image with null description', async () => {
    const testInput: CreateGalleryImageInput = {
      title: 'Simple Image',
      description: null,
      image_url: 'https://example.com/simple.png',
      uploaded_by: testUserId,
      tags: ['simple']
    };

    const result = await createGalleryImage(testInput);

    expect(result.title).toEqual('Simple Image');
    expect(result.description).toBeNull();
    expect(result.image_url).toEqual('https://example.com/simple.png');
    expect(result.uploaded_by).toEqual(testUserId);
    expect(result.tags).toEqual(['simple']);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a gallery image with empty tags array', async () => {
    const testInput: CreateGalleryImageInput = {
      title: 'Untagged Image',
      description: 'Image with no tags',
      image_url: 'https://example.com/untagged.jpg',
      uploaded_by: testUserId,
      tags: []
    };

    const result = await createGalleryImage(testInput);

    expect(result.title).toEqual('Untagged Image');
    expect(result.description).toEqual('Image with no tags');
    expect(result.tags).toEqual([]);
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.tags.length).toBe(0);
  });

  it('should save gallery image to database correctly', async () => {
    const testInput: CreateGalleryImageInput = {
      title: 'Database Test Image',
      description: 'Testing database storage',
      image_url: 'https://example.com/db-test.jpg',
      uploaded_by: testUserId,
      tags: ['database', 'test', 'storage']
    };

    const result = await createGalleryImage(testInput);

    // Query the database to verify data was saved correctly
    const savedImages = await db.select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, result.id))
      .execute();

    expect(savedImages).toHaveLength(1);
    const savedImage = savedImages[0];
    
    expect(savedImage.title).toEqual('Database Test Image');
    expect(savedImage.description).toEqual('Testing database storage');
    expect(savedImage.image_url).toEqual('https://example.com/db-test.jpg');
    expect(savedImage.uploaded_by).toEqual(testUserId);
    expect(savedImage.created_at).toBeInstanceOf(Date);
    
    // Verify tags are stored as JSONB array and returned directly
    expect(Array.isArray(savedImage.tags)).toBe(true);
    expect(savedImage.tags).toEqual(['database', 'test', 'storage']);
  });

  it('should handle maximum number of tags', async () => {
    const testInput: CreateGalleryImageInput = {
      title: 'Many Tags Image',
      description: 'Image with maximum allowed tags',
      image_url: 'https://example.com/many-tags.jpg',
      uploaded_by: testUserId,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10']
    };

    const result = await createGalleryImage(testInput);

    expect(result.tags).toHaveLength(10);
    expect(result.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10']);
  });

  it('should throw error when uploaded_by user does not exist', async () => {
    const testInput: CreateGalleryImageInput = {
      title: 'Invalid User Image',
      description: 'Image uploaded by non-existent user',
      image_url: 'https://example.com/invalid.jpg',
      uploaded_by: 99999, // Non-existent user ID
      tags: ['invalid', 'user']
    };

    await expect(createGalleryImage(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should handle long title and description correctly', async () => {
    const longTitle = 'A'.repeat(100); // Maximum length title
    const longDescription = 'B'.repeat(500); // Maximum length description
    
    const testInput: CreateGalleryImageInput = {
      title: longTitle,
      description: longDescription,
      image_url: 'https://example.com/long-content.jpg',
      uploaded_by: testUserId,
      tags: ['long', 'content']
    };

    const result = await createGalleryImage(testInput);

    expect(result.title).toEqual(longTitle);
    expect(result.title.length).toBe(100);
    expect(result.description).toEqual(longDescription);
    expect(result.description?.length).toBe(500);
  });

  it('should handle special characters in tags and content', async () => {
    const testInput: CreateGalleryImageInput = {
      title: 'Special Characters: àáâãäå & émotions!',
      description: 'Content with special chars: 中文 русский العربية',
      image_url: 'https://example.com/special-chars.jpg',
      uploaded_by: testUserId,
      tags: ['special-chars', 'émotions', '中文', 'test!']
    };

    const result = await createGalleryImage(testInput);

    expect(result.title).toEqual('Special Characters: àáâãäå & émotions!');
    expect(result.description).toEqual('Content with special chars: 中文 русский العربية');
    expect(result.tags).toEqual(['special-chars', 'émotions', '中文', 'test!']);
  });
});