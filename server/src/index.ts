import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  getUserByDiscordIdInputSchema,
  updateUserInputSchema,
  createCharacterInputSchema,
  getCharactersByUserInputSchema,
  updateCharacterInputSchema,
  createRecruitmentApplicationInputSchema,
  reviewRecruitmentApplicationInputSchema,
  createTeamInputSchema,
  joinTeamInputSchema,
  getTeamMembersInputSchema,
  createTreasuryFeeInputSchema,
  submitTreasuryPaymentInputSchema,
  createAnnouncementInputSchema,
  createEventInputSchema,
  registerForEventInputSchema,
  getEventRegistrationsInputSchema,
  createSuggestionInputSchema,
  voteSuggestionInputSchema,
  updateSuggestionStatusInputSchema,
  createGuideInputSchema,
  reviewGuideInputSchema,
  createGalleryImageInputSchema,
  getPaginatedInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUserByDiscordId } from './handlers/get_user_by_discord_id';
import { updateUser } from './handlers/update_user';
import { getAllUsers } from './handlers/get_all_users';
import { createCharacter } from './handlers/create_character';
import { getCharactersByUser } from './handlers/get_characters_by_user';
import { updateCharacter } from './handlers/update_character';
import { createRecruitmentApplication } from './handlers/create_recruitment_application';
import { getPendingRecruitmentApplications } from './handlers/get_pending_recruitment_applications';
import { reviewRecruitmentApplication } from './handlers/review_recruitment_application';
import { createTeam } from './handlers/create_team';
import { getAllTeams } from './handlers/get_all_teams';
import { joinTeam } from './handlers/join_team';
import { getTeamMembers } from './handlers/get_team_members';
import { createTreasuryFee } from './handlers/create_treasury_fee';
import { submitTreasuryPayment } from './handlers/submit_treasury_payment';
import { getCurrentTreasuryFee } from './handlers/get_current_treasury_fee';
import { createAnnouncement } from './handlers/create_announcement';
import { getRecentAnnouncements } from './handlers/get_recent_announcements';
import { createEvent } from './handlers/create_event';
import { getUpcomingEvents } from './handlers/get_upcoming_events';
import { registerForEvent } from './handlers/register_for_event';
import { getEventRegistrations } from './handlers/get_event_registrations';
import { createSuggestion } from './handlers/create_suggestion';
import { getAllSuggestions } from './handlers/get_all_suggestions';
import { voteSuggestion } from './handlers/vote_suggestion';
import { updateSuggestionStatus } from './handlers/update_suggestion_status';
import { createGuide } from './handlers/create_guide';
import { getApprovedGuides } from './handlers/get_approved_guides';
import { getPendingGuides } from './handlers/get_pending_guides';
import { reviewGuide } from './handlers/review_guide';
import { createGalleryImage } from './handlers/create_gallery_image';
import { getGalleryImages } from './handlers/get_gallery_images';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserByDiscordId: publicProcedure
    .input(getUserByDiscordIdInputSchema)
    .query(({ input }) => getUserByDiscordId(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  getAllUsers: publicProcedure
    .query(() => getAllUsers()),

  // Character management routes
  createCharacter: publicProcedure
    .input(createCharacterInputSchema)
    .mutation(({ input }) => createCharacter(input)),

  getCharactersByUser: publicProcedure
    .input(getCharactersByUserInputSchema)
    .query(({ input }) => getCharactersByUser(input)),

  updateCharacter: publicProcedure
    .input(updateCharacterInputSchema)
    .mutation(({ input }) => updateCharacter(input)),

  // Recruitment management routes
  createRecruitmentApplication: publicProcedure
    .input(createRecruitmentApplicationInputSchema)
    .mutation(({ input }) => createRecruitmentApplication(input)),

  getPendingRecruitmentApplications: publicProcedure
    .query(() => getPendingRecruitmentApplications()),

  reviewRecruitmentApplication: publicProcedure
    .input(reviewRecruitmentApplicationInputSchema)
    .mutation(({ input }) => reviewRecruitmentApplication(input)),

  // Team management routes
  createTeam: publicProcedure
    .input(createTeamInputSchema)
    .mutation(({ input }) => createTeam(input)),

  getAllTeams: publicProcedure
    .query(() => getAllTeams()),

  joinTeam: publicProcedure
    .input(joinTeamInputSchema)
    .mutation(({ input }) => joinTeam(input)),

  getTeamMembers: publicProcedure
    .input(getTeamMembersInputSchema)
    .query(({ input }) => getTeamMembers(input)),

  // Treasury management routes
  createTreasuryFee: publicProcedure
    .input(createTreasuryFeeInputSchema)
    .mutation(({ input }) => createTreasuryFee(input)),

  submitTreasuryPayment: publicProcedure
    .input(submitTreasuryPaymentInputSchema)
    .mutation(({ input }) => submitTreasuryPayment(input)),

  getCurrentTreasuryFee: publicProcedure
    .query(() => getCurrentTreasuryFee()),

  // Announcement routes
  createAnnouncement: publicProcedure
    .input(createAnnouncementInputSchema)
    .mutation(({ input }) => createAnnouncement(input)),

  getRecentAnnouncements: publicProcedure
    .query(() => getRecentAnnouncements()),

  // Event management routes
  createEvent: publicProcedure
    .input(createEventInputSchema)
    .mutation(({ input }) => createEvent(input)),

  getUpcomingEvents: publicProcedure
    .query(() => getUpcomingEvents()),

  registerForEvent: publicProcedure
    .input(registerForEventInputSchema)
    .mutation(({ input }) => registerForEvent(input)),

  getEventRegistrations: publicProcedure
    .input(getEventRegistrationsInputSchema)
    .query(({ input }) => getEventRegistrations(input)),

  // Suggestion system routes
  createSuggestion: publicProcedure
    .input(createSuggestionInputSchema)
    .mutation(({ input }) => createSuggestion(input)),

  getAllSuggestions: publicProcedure
    .query(() => getAllSuggestions()),

  voteSuggestion: publicProcedure
    .input(voteSuggestionInputSchema)
    .mutation(({ input }) => voteSuggestion(input)),

  updateSuggestionStatus: publicProcedure
    .input(updateSuggestionStatusInputSchema)
    .mutation(({ input }) => updateSuggestionStatus(input)),

  // Guide system routes
  createGuide: publicProcedure
    .input(createGuideInputSchema)
    .mutation(({ input }) => createGuide(input)),

  getApprovedGuides: publicProcedure
    .query(() => getApprovedGuides()),

  getPendingGuides: publicProcedure
    .query(() => getPendingGuides()),

  reviewGuide: publicProcedure
    .input(reviewGuideInputSchema)
    .mutation(({ input }) => reviewGuide(input)),

  // Gallery routes
  createGalleryImage: publicProcedure
    .input(createGalleryImageInputSchema)
    .mutation(({ input }) => createGalleryImage(input)),

  getGalleryImages: publicProcedure
    .input(getPaginatedInputSchema)
    .query(({ input }) => getGalleryImages(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();