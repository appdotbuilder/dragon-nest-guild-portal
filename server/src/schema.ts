import { z } from 'zod';

// Enums
export const guildRoleSchema = z.enum([
  'guild_master',
  'vice_guild_master', 
  'senior_guild_member',
  'member',
  'recruit'
]);

export const dragonNestJobSchema = z.enum([
  // Warrior
  'gladiator', 'moonlord', 'barbarian', 'destroyer', 'mystic_knight', 'grand_master',
  // Cleric
  'guardian', 'crusader', 'saint', 'inquisitor',
  // Archer
  'sniper', 'artillery', 'tempest', 'wind_walker',
  // Sorceress
  'saleana', 'elestra', 'smasher', 'majesty',
  // Tinkerer
  'shooting_star', 'gear_master', 'adept', 'physician',
  // Kali
  'dark_summoner', 'soul_eater', 'blade_dancer', 'spirit_dancer',
  // Assassin
  'ripper', 'raven', 'light_fury', 'abyss_walker',
  // Lencea
  'flurry', 'sting_breezer', 'avalanche', 'randgrid',
  // Machina
  'defensio', 'ruina', 'impactor', 'luster',
  // Vandar
  'duelist', 'trickster', 'revenant', 'maverick'
]);

export const suggestionStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'implemented'
]);

export const guideStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected'
]);

export const eventStatusSchema = z.enum([
  'upcoming',
  'ongoing',
  'completed',
  'cancelled'
]);

export const treasuryStatusSchema = z.enum([
  'paid',
  'pending',
  'overdue',
  'exempt'
]);

// User schema
export const userSchema = z.object({
  id: z.number(),
  discord_id: z.string(),
  discord_username: z.string(),
  discord_avatar: z.string().nullable(),
  guild_role: guildRoleSchema,
  treasury_status: treasuryStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Character schema
export const characterSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  ign: z.string(),
  job: dragonNestJobSchema,
  stats_screenshot_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Character = z.infer<typeof characterSchema>;

// Recruitment application schema
export const recruitmentApplicationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  application_text: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewed_by: z.number().nullable(),
  reviewed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type RecruitmentApplication = z.infer<typeof recruitmentApplicationSchema>;

// Team schema
export const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_by: z.number(),
  discord_channel_id: z.string().nullable(),
  max_members: z.number(),
  created_at: z.coerce.date()
});

export type Team = z.infer<typeof teamSchema>;

// Team member schema
export const teamMemberSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  user_id: z.number(),
  joined_at: z.coerce.date()
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

// Treasury fee schema
export const treasuryFeeSchema = z.object({
  id: z.number(),
  amount: z.number(),
  week_start: z.coerce.date(),
  week_end: z.coerce.date(),
  set_by: z.number(),
  created_at: z.coerce.date()
});

export type TreasuryFee = z.infer<typeof treasuryFeeSchema>;

// Treasury payment schema
export const treasuryPaymentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  treasury_fee_id: z.number(),
  proof_url: z.string(),
  submitted_at: z.coerce.date(),
  verified_by: z.number().nullable(),
  verified_at: z.coerce.date().nullable()
});

export type TreasuryPayment = z.infer<typeof treasuryPaymentSchema>;

// Announcement schema
export const announcementSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type Announcement = z.infer<typeof announcementSchema>;

// Event schema
export const eventSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  event_date: z.coerce.date(),
  max_slots: z.number(),
  status: eventStatusSchema,
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type Event = z.infer<typeof eventSchema>;

// Event registration schema
export const eventRegistrationSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  user_id: z.number(),
  character_id: z.number(),
  registered_at: z.coerce.date()
});

export type EventRegistration = z.infer<typeof eventRegistrationSchema>;

// Suggestion schema
export const suggestionSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  status: suggestionStatusSchema,
  upvotes: z.number(),
  downvotes: z.number(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Suggestion = z.infer<typeof suggestionSchema>;

// Suggestion vote schema
export const suggestionVoteSchema = z.object({
  id: z.number(),
  suggestion_id: z.number(),
  user_id: z.number(),
  vote_type: z.enum(['upvote', 'downvote']),
  created_at: z.coerce.date()
});

export type SuggestionVote = z.infer<typeof suggestionVoteSchema>;

// Guide schema
export const guideSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  status: guideStatusSchema,
  created_by: z.number(),
  approved_by: z.number().nullable(),
  approved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Guide = z.infer<typeof guideSchema>;

// Gallery image schema
export const galleryImageSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  image_url: z.string(),
  uploaded_by: z.number(),
  tags: z.array(z.string()),
  created_at: z.coerce.date()
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;

// Input schemas for creating/updating

// User input schemas
export const createUserInputSchema = z.object({
  discord_id: z.string(),
  discord_username: z.string(),
  discord_avatar: z.string().nullable(),
  guild_role: guildRoleSchema.default('recruit')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  guild_role: guildRoleSchema.optional(),
  treasury_status: treasuryStatusSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Character input schemas
export const createCharacterInputSchema = z.object({
  user_id: z.number(),
  ign: z.string().min(1).max(20),
  job: dragonNestJobSchema,
  stats_screenshot_url: z.string().url().nullable()
});

export type CreateCharacterInput = z.infer<typeof createCharacterInputSchema>;

export const updateCharacterInputSchema = z.object({
  id: z.number(),
  ign: z.string().min(1).max(20).optional(),
  job: dragonNestJobSchema.optional(),
  stats_screenshot_url: z.string().url().nullable().optional()
});

export type UpdateCharacterInput = z.infer<typeof updateCharacterInputSchema>;

// Recruitment input schemas
export const createRecruitmentApplicationInputSchema = z.object({
  user_id: z.number(),
  application_text: z.string().min(50).max(1000)
});

export type CreateRecruitmentApplicationInput = z.infer<typeof createRecruitmentApplicationInputSchema>;

export const reviewRecruitmentApplicationInputSchema = z.object({
  application_id: z.number(),
  status: z.enum(['approved', 'rejected']),
  reviewed_by: z.number()
});

export type ReviewRecruitmentApplicationInput = z.infer<typeof reviewRecruitmentApplicationInputSchema>;

// Team input schemas
export const createTeamInputSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).nullable(),
  created_by: z.number(),
  max_members: z.number().int().min(2).max(20)
});

export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;

export const joinTeamInputSchema = z.object({
  team_id: z.number(),
  user_id: z.number()
});

export type JoinTeamInput = z.infer<typeof joinTeamInputSchema>;

// Treasury input schemas
export const createTreasuryFeeInputSchema = z.object({
  amount: z.number().positive(),
  week_start: z.coerce.date(),
  week_end: z.coerce.date(),
  set_by: z.number()
});

export type CreateTreasuryFeeInput = z.infer<typeof createTreasuryFeeInputSchema>;

export const submitTreasuryPaymentInputSchema = z.object({
  user_id: z.number(),
  treasury_fee_id: z.number(),
  proof_url: z.string().url()
});

export type SubmitTreasuryPaymentInput = z.infer<typeof submitTreasuryPaymentInputSchema>;

// Announcement input schemas
export const createAnnouncementInputSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  created_by: z.number()
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementInputSchema>;

// Event input schemas
export const createEventInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  event_date: z.coerce.date(),
  max_slots: z.number().int().min(1).max(100),
  created_by: z.number()
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const registerForEventInputSchema = z.object({
  event_id: z.number(),
  user_id: z.number(),
  character_id: z.number()
});

export type RegisterForEventInput = z.infer<typeof registerForEventInputSchema>;

// Suggestion input schemas
export const createSuggestionInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  created_by: z.number()
});

export type CreateSuggestionInput = z.infer<typeof createSuggestionInputSchema>;

export const voteSuggestionInputSchema = z.object({
  suggestion_id: z.number(),
  user_id: z.number(),
  vote_type: z.enum(['upvote', 'downvote'])
});

export type VoteSuggestionInput = z.infer<typeof voteSuggestionInputSchema>;

export const updateSuggestionStatusInputSchema = z.object({
  suggestion_id: z.number(),
  status: suggestionStatusSchema
});

export type UpdateSuggestionStatusInput = z.infer<typeof updateSuggestionStatusInputSchema>;

// Guide input schemas
export const createGuideInputSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(100).max(10000),
  created_by: z.number()
});

export type CreateGuideInput = z.infer<typeof createGuideInputSchema>;

export const reviewGuideInputSchema = z.object({
  guide_id: z.number(),
  status: z.enum(['approved', 'rejected']),
  approved_by: z.number()
});

export type ReviewGuideInput = z.infer<typeof reviewGuideInputSchema>;

// Gallery input schemas
export const createGalleryImageInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  image_url: z.string().url(),
  uploaded_by: z.number(),
  tags: z.array(z.string().min(1).max(20)).max(10)
});

export type CreateGalleryImageInput = z.infer<typeof createGalleryImageInputSchema>;

// Query input schemas
export const getPaginatedInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10)
});

export type GetPaginatedInput = z.infer<typeof getPaginatedInputSchema>;

export const getUserByDiscordIdInputSchema = z.object({
  discord_id: z.string()
});

export type GetUserByDiscordIdInput = z.infer<typeof getUserByDiscordIdInputSchema>;

export const getCharactersByUserInputSchema = z.object({
  user_id: z.number()
});

export type GetCharactersByUserInput = z.infer<typeof getCharactersByUserInputSchema>;

export const getTeamMembersInputSchema = z.object({
  team_id: z.number()
});

export type GetTeamMembersInput = z.infer<typeof getTeamMembersInputSchema>;

export const getEventRegistrationsInputSchema = z.object({
  event_id: z.number()
});

export type GetEventRegistrationsInput = z.infer<typeof getEventRegistrationsInputSchema>;