import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new user from Discord OAuth data
    // and persisting it in the database with default 'recruit' role.
    return Promise.resolve({
        id: 0,
        discord_id: input.discord_id,
        discord_username: input.discord_username,
        discord_avatar: input.discord_avatar,
        guild_role: input.guild_role || 'recruit',
        treasury_status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
    } as User);
};