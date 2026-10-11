import mongoose, { Schema, InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },

    // single-use tokens, stored hashed; see lib/tokens.ts
    verifyTokenHash: { type: String, default: null },
    verifyTokenExp: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExp: { type: Date, default: null },

    targetYear: { type: Number, default: () => new Date().getFullYear() + 1 },
    dailyMinutes: { type: Number, default: 90 },

    // streak bookkeeping, updated on each submitted attempt
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDay: { type: String, default: null }, // YYYY-MM-DD in IST
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
