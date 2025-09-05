import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  jsonb,
  date,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const guildRoleEnum = pgEnum('guild_role', [
  'guild_master',
  'vice_guild_master', 
  'senior_guild_member',
  'member',
  'recruit'
]);

export const dragonNestJobEnum = pgEnum('dragon_nest_job', [
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

export const suggestionStatusEnum = pgEnum('suggestion_status', [
  'pending',
  'approved',
  'rejected',
  'implemented'
]);

export const guideStatusEnum = pgEnum('guide_status', [
  'pending',
  'approved',
  'rejected'
]);

export const eventStatusEnum = pgEnum('event_status', [
  'upcoming',
  'ongoing',
  'completed',
  'cancelled'
]);

export const treasuryStatusEnum = pgEnum('treasury_status', [
  'paid',
  'pending',
  'overdue',
  'exempt'
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'approved',
  'rejected'
]);

export const voteTypeEnum = pgEnum('vote_type', [
  'upvote',
  'downvote'
]);

// Tables
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  discord_id: text('discord_id').notNull().unique(),
  discord_username: text('discord_username').notNull(),
  discord_avatar: text('discord_avatar'),
  guild_role: guildRoleEnum('guild_role').notNull().default('recruit'),
  treasury_status: treasuryStatusEnum('treasury_status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  discordIdIndex: index('idx_users_discord_id').on(table.discord_id),
  guildRoleIndex: index('idx_users_guild_role').on(table.guild_role)
}));

export const charactersTable = pgTable('characters', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  ign: text('ign').notNull(),
  job: dragonNestJobEnum('job').notNull(),
  stats_screenshot_url: text('stats_screenshot_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIndex: index('idx_characters_user_id').on(table.user_id),
  ignIndex: index('idx_characters_ign').on(table.ign)
}));

export const recruitmentApplicationsTable = pgTable('recruitment_applications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  application_text: text('application_text').notNull(),
  status: applicationStatusEnum('status').notNull().default('pending'),
  reviewed_by: integer('reviewed_by').references(() => usersTable.id),
  reviewed_at: timestamp('reviewed_at'),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIndex: index('idx_recruitment_user_id').on(table.user_id),
  statusIndex: index('idx_recruitment_status').on(table.status)
}));

export const teamsTable = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  discord_channel_id: text('discord_channel_id'),
  max_members: integer('max_members').notNull().default(5),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  nameIndex: index('idx_teams_name').on(table.name),
  createdByIndex: index('idx_teams_created_by').on(table.created_by)
}));

export const teamMembersTable = pgTable('team_members', {
  id: serial('id').primaryKey(),
  team_id: integer('team_id').notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  joined_at: timestamp('joined_at').defaultNow().notNull()
}, (table) => ({
  teamIdIndex: index('idx_team_members_team_id').on(table.team_id),
  userIdIndex: index('idx_team_members_user_id').on(table.user_id)
}));

export const treasuryFeesTable = pgTable('treasury_fees', {
  id: serial('id').primaryKey(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  week_start: date('week_start').notNull(),
  week_end: date('week_end').notNull(),
  set_by: integer('set_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  weekStartIndex: index('idx_treasury_fees_week_start').on(table.week_start),
  setByIndex: index('idx_treasury_fees_set_by').on(table.set_by)
}));

export const treasuryPaymentsTable = pgTable('treasury_payments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  treasury_fee_id: integer('treasury_fee_id').notNull().references(() => treasuryFeesTable.id, { onDelete: 'cascade' }),
  proof_url: text('proof_url').notNull(),
  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
  verified_by: integer('verified_by').references(() => usersTable.id),
  verified_at: timestamp('verified_at')
}, (table) => ({
  userIdIndex: index('idx_treasury_payments_user_id').on(table.user_id),
  treasuryFeeIdIndex: index('idx_treasury_payments_treasury_fee_id').on(table.treasury_fee_id)
}));

export const announcementsTable = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  createdByIndex: index('idx_announcements_created_by').on(table.created_by),
  createdAtIndex: index('idx_announcements_created_at').on(table.created_at)
}));

export const eventsTable = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  event_date: timestamp('event_date').notNull(),
  max_slots: integer('max_slots').notNull(),
  status: eventStatusEnum('status').notNull().default('upcoming'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  eventDateIndex: index('idx_events_event_date').on(table.event_date),
  statusIndex: index('idx_events_status').on(table.status),
  createdByIndex: index('idx_events_created_by').on(table.created_by)
}));

export const eventRegistrationsTable = pgTable('event_registrations', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').notNull().references(() => eventsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  character_id: integer('character_id').notNull().references(() => charactersTable.id, { onDelete: 'cascade' }),
  registered_at: timestamp('registered_at').defaultNow().notNull()
}, (table) => ({
  eventIdIndex: index('idx_event_registrations_event_id').on(table.event_id),
  userIdIndex: index('idx_event_registrations_user_id').on(table.user_id)
}));

export const suggestionsTable = pgTable('suggestions', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: suggestionStatusEnum('status').notNull().default('pending'),
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  statusIndex: index('idx_suggestions_status').on(table.status),
  createdByIndex: index('idx_suggestions_created_by').on(table.created_by),
  createdAtIndex: index('idx_suggestions_created_at').on(table.created_at)
}));

export const suggestionVotesTable = pgTable('suggestion_votes', {
  id: serial('id').primaryKey(),
  suggestion_id: integer('suggestion_id').notNull().references(() => suggestionsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  vote_type: voteTypeEnum('vote_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  suggestionIdIndex: index('idx_suggestion_votes_suggestion_id').on(table.suggestion_id),
  userIdIndex: index('idx_suggestion_votes_user_id').on(table.user_id)
}));

export const guidesTable = pgTable('guides', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: guideStatusEnum('status').notNull().default('pending'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  approved_by: integer('approved_by').references(() => usersTable.id),
  approved_at: timestamp('approved_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  statusIndex: index('idx_guides_status').on(table.status),
  createdByIndex: index('idx_guides_created_by').on(table.created_by),
  approvedByIndex: index('idx_guides_approved_by').on(table.approved_by)
}));

export const galleryImagesTable = pgTable('gallery_images', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  image_url: text('image_url').notNull(),
  uploaded_by: integer('uploaded_by').notNull().references(() => usersTable.id),
  tags: jsonb('tags').notNull().default('[]'),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uploadedByIndex: index('idx_gallery_images_uploaded_by').on(table.uploaded_by),
  createdAtIndex: index('idx_gallery_images_created_at').on(table.created_at)
}));

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  characters: many(charactersTable),
  recruitmentApplications: many(recruitmentApplicationsTable),
  createdTeams: many(teamsTable),
  teamMemberships: many(teamMembersTable),
  treasuryPayments: many(treasuryPaymentsTable),
  announcements: many(announcementsTable),
  events: many(eventsTable),
  eventRegistrations: many(eventRegistrationsTable),
  suggestions: many(suggestionsTable),
  suggestionVotes: many(suggestionVotesTable),
  guides: many(guidesTable),
  approvedGuides: many(guidesTable, { relationName: 'approved_guides' }),
  galleryImages: many(galleryImagesTable)
}));

export const charactersRelations = relations(charactersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [charactersTable.user_id],
    references: [usersTable.id]
  }),
  eventRegistrations: many(eventRegistrationsTable)
}));

export const recruitmentApplicationsRelations = relations(recruitmentApplicationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [recruitmentApplicationsTable.user_id],
    references: [usersTable.id]
  }),
  reviewer: one(usersTable, {
    fields: [recruitmentApplicationsTable.reviewed_by],
    references: [usersTable.id],
    relationName: 'reviewed_applications'
  })
}));

export const teamsRelations = relations(teamsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [teamsTable.created_by],
    references: [usersTable.id]
  }),
  members: many(teamMembersTable)
}));

export const teamMembersRelations = relations(teamMembersTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [teamMembersTable.team_id],
    references: [teamsTable.id]
  }),
  user: one(usersTable, {
    fields: [teamMembersTable.user_id],
    references: [usersTable.id]
  })
}));

export const treasuryFeesRelations = relations(treasuryFeesTable, ({ one, many }) => ({
  setter: one(usersTable, {
    fields: [treasuryFeesTable.set_by],
    references: [usersTable.id]
  }),
  payments: many(treasuryPaymentsTable)
}));

export const treasuryPaymentsRelations = relations(treasuryPaymentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [treasuryPaymentsTable.user_id],
    references: [usersTable.id]
  }),
  treasuryFee: one(treasuryFeesTable, {
    fields: [treasuryPaymentsTable.treasury_fee_id],
    references: [treasuryFeesTable.id]
  }),
  verifier: one(usersTable, {
    fields: [treasuryPaymentsTable.verified_by],
    references: [usersTable.id],
    relationName: 'verified_payments'
  })
}));

export const announcementsRelations = relations(announcementsTable, ({ one }) => ({
  creator: one(usersTable, {
    fields: [announcementsTable.created_by],
    references: [usersTable.id]
  })
}));

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [eventsTable.created_by],
    references: [usersTable.id]
  }),
  registrations: many(eventRegistrationsTable)
}));

export const eventRegistrationsRelations = relations(eventRegistrationsTable, ({ one }) => ({
  event: one(eventsTable, {
    fields: [eventRegistrationsTable.event_id],
    references: [eventsTable.id]
  }),
  user: one(usersTable, {
    fields: [eventRegistrationsTable.user_id],
    references: [usersTable.id]
  }),
  character: one(charactersTable, {
    fields: [eventRegistrationsTable.character_id],
    references: [charactersTable.id]
  })
}));

export const suggestionsRelations = relations(suggestionsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [suggestionsTable.created_by],
    references: [usersTable.id]
  }),
  votes: many(suggestionVotesTable)
}));

export const suggestionVotesRelations = relations(suggestionVotesTable, ({ one }) => ({
  suggestion: one(suggestionsTable, {
    fields: [suggestionVotesTable.suggestion_id],
    references: [suggestionsTable.id]
  }),
  user: one(usersTable, {
    fields: [suggestionVotesTable.user_id],
    references: [usersTable.id]
  })
}));

export const guidesRelations = relations(guidesTable, ({ one }) => ({
  creator: one(usersTable, {
    fields: [guidesTable.created_by],
    references: [usersTable.id]
  }),
  approver: one(usersTable, {
    fields: [guidesTable.approved_by],
    references: [usersTable.id],
    relationName: 'approved_guides'
  })
}));

export const galleryImagesRelations = relations(galleryImagesTable, ({ one }) => ({
  uploader: one(usersTable, {
    fields: [galleryImagesTable.uploaded_by],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  characters: charactersTable,
  recruitmentApplications: recruitmentApplicationsTable,
  teams: teamsTable,
  teamMembers: teamMembersTable,
  treasuryFees: treasuryFeesTable,
  treasuryPayments: treasuryPaymentsTable,
  announcements: announcementsTable,
  events: eventsTable,
  eventRegistrations: eventRegistrationsTable,
  suggestions: suggestionsTable,
  suggestionVotes: suggestionVotesTable,
  guides: guidesTable,
  galleryImages: galleryImagesTable
};

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Character = typeof charactersTable.$inferSelect;
export type NewCharacter = typeof charactersTable.$inferInsert;
export type RecruitmentApplication = typeof recruitmentApplicationsTable.$inferSelect;
export type NewRecruitmentApplication = typeof recruitmentApplicationsTable.$inferInsert;
export type Team = typeof teamsTable.$inferSelect;
export type NewTeam = typeof teamsTable.$inferInsert;
export type TeamMember = typeof teamMembersTable.$inferSelect;
export type NewTeamMember = typeof teamMembersTable.$inferInsert;
export type TreasuryFee = typeof treasuryFeesTable.$inferSelect;
export type NewTreasuryFee = typeof treasuryFeesTable.$inferInsert;
export type TreasuryPayment = typeof treasuryPaymentsTable.$inferSelect;
export type NewTreasuryPayment = typeof treasuryPaymentsTable.$inferInsert;
export type Announcement = typeof announcementsTable.$inferSelect;
export type NewAnnouncement = typeof announcementsTable.$inferInsert;
export type Event = typeof eventsTable.$inferSelect;
export type NewEvent = typeof eventsTable.$inferInsert;
export type EventRegistration = typeof eventRegistrationsTable.$inferSelect;
export type NewEventRegistration = typeof eventRegistrationsTable.$inferInsert;
export type Suggestion = typeof suggestionsTable.$inferSelect;
export type NewSuggestion = typeof suggestionsTable.$inferInsert;
export type SuggestionVote = typeof suggestionVotesTable.$inferSelect;
export type NewSuggestionVote = typeof suggestionVotesTable.$inferInsert;
export type Guide = typeof guidesTable.$inferSelect;
export type NewGuide = typeof guidesTable.$inferInsert;
export type GalleryImage = typeof galleryImagesTable.$inferSelect;
export type NewGalleryImage = typeof galleryImagesTable.$inferInsert;