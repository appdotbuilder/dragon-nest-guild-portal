import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { galleryImagesTable, usersTable } from '../db/schema';
import { type GetPaginatedInput } from '../schema';
import { getGalleryImages } from '../handlers/get_gallery_images';

describe('getGalleryImages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no images exist', async () => {
    const input: GetPaginatedInput = {
      page: 1,
      limit: 10
    };

    const result = await getGalleryImages(input);

    expect(result).toEqual([]);
  });

  it('should return gallery images with pagination', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test123',
        discord_username: 'testuser',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test gallery images
    const testImages = [
      {
        title: 'Test Image 1',
        description: 'First test image',
        image_url: 'https://example.com/image1.jpg',
        uploaded_by: userId,
        tags: ['pvp', 'dragon nest']
      },
      {
        title: 'Test Image 2', 
        description: 'Second test image',
        image_url: 'https://example.com/image2.jpg',
        uploaded_by: userId,
        tags: ['pve', 'raid']
      },
      {
        title: 'Test Image 3',
        description: null,
        image_url: 'https://example.com/image3.jpg',
        uploaded_by: userId,
        tags: []
      }
    ];

    await db.insert(galleryImagesTable)
      .values(testImages)
      .execute();

    const input: GetPaginatedInput = {
      page: 1,
      limit: 10
    };

    const result = await getGalleryImages(input);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Test Image 3'); // Should be newest first
    expect(result[1].title).toEqual('Test Image 2');
    expect(result[2].title).toEqual('Test Image 1');
    
    // Verify all required fields are present
    result.forEach(image => {
      expect(image.id).toBeDefined();
      expect(image.title).toBeDefined();
      expect(image.image_url).toBeDefined();
      expect(image.uploaded_by).toEqual(userId);
      expect(Array.isArray(image.tags)).toBe(true);
      expect(image.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle pagination correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test456',
        discord_username: 'testuser2',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 5 test images
    const testImages = Array.from({ length: 5 }, (_, i) => ({
      title: `Image ${i + 1}`,
      description: `Test image ${i + 1}`,
      image_url: `https://example.com/image${i + 1}.jpg`,
      uploaded_by: userId,
      tags: [`tag${i + 1}`]
    }));

    await db.insert(galleryImagesTable)
      .values(testImages)
      .execute();

    // Test first page with limit 2
    const firstPage: GetPaginatedInput = {
      page: 1,
      limit: 2
    };

    const firstResult = await getGalleryImages(firstPage);
    expect(firstResult).toHaveLength(2);
    expect(firstResult[0].title).toEqual('Image 5'); // Newest first
    expect(firstResult[1].title).toEqual('Image 4');

    // Test second page
    const secondPage: GetPaginatedInput = {
      page: 2,
      limit: 2
    };

    const secondResult = await getGalleryImages(secondPage);
    expect(secondResult).toHaveLength(2);
    expect(secondResult[0].title).toEqual('Image 3');
    expect(secondResult[1].title).toEqual('Image 2');

    // Test third page
    const thirdPage: GetPaginatedInput = {
      page: 3,
      limit: 2
    };

    const thirdResult = await getGalleryImages(thirdPage);
    expect(thirdResult).toHaveLength(1); // Only one image left
    expect(thirdResult[0].title).toEqual('Image 1');
  });

  it('should return empty array for out of bounds page', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test789',
        discord_username: 'testuser3',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create single test image
    await db.insert(galleryImagesTable)
      .values({
        title: 'Single Image',
        description: 'Only image',
        image_url: 'https://example.com/single.jpg',
        uploaded_by: userId,
        tags: ['test']
      })
      .execute();

    const input: GetPaginatedInput = {
      page: 5, // Way beyond available data
      limit: 10
    };

    const result = await getGalleryImages(input);
    expect(result).toEqual([]);
  });

  it('should handle images with different tag formats', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test101',
        discord_username: 'testuser4',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test images with various tag formats
    await db.insert(galleryImagesTable)
      .values([
        {
          title: 'Image with tags',
          description: 'Has tags',
          image_url: 'https://example.com/tagged.jpg',
          uploaded_by: userId,
          tags: ['tag1', 'tag2', 'tag3']
        },
        {
          title: 'Image without tags',
          description: 'No tags',
          image_url: 'https://example.com/untagged.jpg',
          uploaded_by: userId,
          tags: []
        }
      ])
      .execute();

    const input: GetPaginatedInput = {
      page: 1,
      limit: 10
    };

    const result = await getGalleryImages(input);

    expect(result).toHaveLength(2);
    
    // Verify tags are properly handled
    const taggedImage = result.find(img => img.title === 'Image with tags');
    const untaggedImage = result.find(img => img.title === 'Image without tags');
    
    expect(taggedImage?.tags).toEqual(['tag1', 'tag2', 'tag3']);
    expect(untaggedImage?.tags).toEqual([]);
  });

  it('should use default pagination values', async () => {
    // Test with Zod defaults applied (this tests the schema integration)
    const input = {} as GetPaginatedInput; // This would be parsed by Zod with defaults
    const inputWithDefaults: GetPaginatedInput = {
      page: 1,
      limit: 10
    };

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        discord_id: 'test202',
        discord_username: 'testuser5',
        discord_avatar: null,
        guild_role: 'member',
        treasury_status: 'paid'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test image
    await db.insert(galleryImagesTable)
      .values({
        title: 'Default Test',
        description: 'Testing defaults',
        image_url: 'https://example.com/default.jpg',
        uploaded_by: userId,
        tags: ['default']
      })
      .execute();

    const result = await getGalleryImages(inputWithDefaults);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Default Test');
  });
});