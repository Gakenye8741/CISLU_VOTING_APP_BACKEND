import { 
  pgTable, text, boolean, timestamp, uuid, pgEnum, varchar, integer, jsonb, index, unique 
} from 'drizzle-orm/pg-core';

// --- ENUMS ---
export const roleEnum = pgEnum('role', ['admin', 'member']);
export const yearEnum = pgEnum('year_of_study', ['1', '2', '3', '4']);
export const electionStatusEnum = pgEnum('election_status', ['cancelled','upcoming','voting', 'completed']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'under_review', 'approved', 'rejected']);

// --- 1. ELECTIONS ---
export const elections = pgTable('elections', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: electionStatusEnum('status').default('upcoming'),
  isResultsPublic: boolean('is_results_public').default(false),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 2. POSITIONS (Dynamic Roles per Election) ---
export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  electionId: uuid('election_id').references(() => elections.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(), // e.g., "Chairperson", "Treasurer"
  minParticipationPoints: integer('min_points_required').default(0), 
  slotsAvailable: integer('slots_available').default(1), // How many winners for this role
  targetYears: yearEnum('target_years').array(), // Optional: restrict voting/applying to specific year
});

// --- 3. USERS (The Member Registry) ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentRegNo: varchar('student_reg_no', { length: 50 }).notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // Hashed (Bcrypt/Argon2)
  fullName: text('full_name').notNull(),
  yearOfStudy: yearEnum('year_of_study').notNull(),
  role: roleEnum('role').default('member'),
  
  // Scrutiny Data
  participationPoints: integer('participation_points').default(0),
  isGoodStanding: boolean('is_good_standing').default(true),
  
  // Security
  isActive: boolean('is_active').default(true),
  isLocked: boolean('is_locked').default(false),
  failedLoginAttempts: integer('failed_attempts').default(0),
  // Add these to your 'users' table in schema.ts
unlockCode: text('unlock_code'),
unlockCodeExpiresAt: timestamp('unlock_code_expires_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  regIdx: index('reg_no_idx').on(table.studentRegNo),
}));

// --- 4. CANDIDATE APPLICATIONS (The Scrutiny Workflow) ---
export const candidateApplications = pgTable('candidate_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  electionId: uuid('election_id').references(() => elections.id).notNull(),
  positionId: uuid('position_id').references(() => positions.id).notNull(),
  
  statementOfIntent: text('statement_of_intent').notNull(),
  manifesto: text('manifesto').notNull(),
  imageUrl: text('image_url'),
  
  status: applicationStatusEnum('status').default('pending'),
  adminRemarks: text('admin_remarks'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  // Prevents multiple applications for the same position by one person
  unqApp: unique().on(t.userId, t.electionId, t.positionId),
}));

// --- 5. APPROVED CANDIDATES (The Final Ballot) ---
export const candidates = pgTable('candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  electionId: uuid('election_id').references(() => elections.id, { onDelete: 'cascade' }).notNull(),
  positionId: uuid('position_id').references(() => positions.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(), 
  applicationId: uuid('application_id').references(() => candidateApplications.id),
  
  fullName: text('full_name').notNull(),
  manifesto: text('manifesto').notNull(),
  imageUrl: text('image_url'),
  ballotNumber: integer('ballot_number'), // Admin-defined order
});

// --- 6. VOTER HISTORY (Audit Trail - Identity) ---
export const voterHistory = pgTable('voter_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  electionId: uuid('election_id').references(() => elections.id).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  votedAt: timestamp('voted_at').defaultNow(),
}, (t) => ({
  // The "One Vote Per Person" constraint
  oneVotePerElection: unique().on(t.userId, t.electionId),
}));

// --- 7. VOTES (The Secret Ballot Box) ---
export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom(),
  electionId: uuid('election_id').references(() => elections.id).notNull(),
  positionId: uuid('position_id').references(() => positions.id).notNull(),
  candidateId: uuid('candidate_id').references(() => candidates.id).notNull(),
  
  voterYearGroup: yearEnum('voter_year_group'), // For analytics
  verificationReceipt: text('verification_receipt').unique(), // For anonymous check
  castAt: timestamp('cast_at').defaultNow(),
});

// --- 8. SESSIONS (Auth & Security Management) ---
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull(), // Refresh token
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 9. AUDIT LOGS (Admin Accountability) ---
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => users.id),
  action: text('action').notNull(), // e.g., "APPROVE_APPLICATION", "RESET_USER_PASSWORD"
  targetId: uuid('target_id'), 
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

import { relations } from 'drizzle-orm';

// USERS RELATIONS
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  applications: many(candidateApplications),
  voterHistories: many(voterHistory),
  auditLogs: many(auditLogs),
  // If an admin reviews applications
  reviewedApplications: many(candidateApplications),
}));

// ELECTIONS RELATIONS
export const electionsRelations = relations(elections, ({ many }) => ({
  positions: many(positions),
  applications: many(candidateApplications),
  candidates: many(candidates),
  votes: many(votes),
  voterHistories: many(voterHistory),
}));

// POSITIONS RELATIONS
export const positionsRelations = relations(positions, ({ one, many }) => ({
  election: one(elections, {
    fields: [positions.electionId],
    references: [elections.id],
  }),
  applications: many(candidateApplications),
  candidates: many(candidates),
  votes: many(votes),
}));

// CANDIDATE APPLICATIONS RELATIONS
export const candidateApplicationsRelations = relations(candidateApplications, ({ one }) => ({
  user: one(users, {
    fields: [candidateApplications.userId],
    references: [users.id],
  }),
  election: one(elections, {
    fields: [candidateApplications.electionId],
    references: [elections.id],
  }),
  position: one(positions, {
    fields: [candidateApplications.positionId],
    references: [positions.id],
  }),
  reviewer: one(users, {
    fields: [candidateApplications.reviewedBy],
    references: [users.id],
  }),
}));

// CANDIDATES RELATIONS
export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  election: one(elections, {
    fields: [candidates.electionId],
    references: [elections.id],
  }),
  position: one(positions, {
    fields: [candidates.positionId],
    references: [positions.id],
  }),
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id],
  }),
  votes: many(votes),
}));

// VOTES RELATIONS
export const votesRelations = relations(votes, ({ one }) => ({
  election: one(elections, {
    fields: [votes.electionId],
    references: [elections.id],
  }),
  position: one(positions, {
    fields: [votes.positionId],
    references: [positions.id],
  }),
  candidate: one(candidates, {
    fields: [votes.candidateId],
    references: [candidates.id],
  }),
}));

// VOTER HISTORY RELATIONS
export const voterHistoryRelations = relations(voterHistory, ({ one }) => ({
  user: one(users, {
    fields: [voterHistory.userId],
    references: [users.id],
  }),
  election: one(elections, {
    fields: [voterHistory.electionId],
    references: [elections.id],
  }),
}));

// SESSIONS RELATIONS
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// AUDIT LOGS RELATIONS
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [auditLogs.adminId],
    references: [users.id],
  }),
}));

/* ===============================
   4️⃣ TYPE INFERENCES
=============================== */

// 1. Elections
export type TselectElection = typeof elections.$inferSelect;
export type TinsertElection = typeof elections.$inferInsert;

// 2. Positions
export type TselectPosition = typeof positions.$inferSelect;
export type TinsertPosition = typeof positions.$inferInsert;

// 3. Users
export type  TselectUser = typeof users.$inferSelect;
export type TinsertUser = typeof users.$inferInsert;

// 4. Candidate Applications (The Scrutiny Layer)
export type TselectCandidateApplication = typeof candidateApplications.$inferSelect;
export type TinsertCandidateApplication = typeof candidateApplications.$inferInsert;

// 5. Candidates (Approved Ballot Entries)
export type TselectCandidate = typeof candidates.$inferSelect;
export type TinsertCandidate = typeof candidates.$inferInsert;

// 6. Voter History (Participation Log)
export type VoterHistory = typeof voterHistory.$inferSelect;
export type NewVoterHistory = typeof voterHistory.$inferInsert;

// 7. Votes (Anonymized Ballots)
export type TselectVote = typeof votes.$inferSelect;
export type TinsertVote = typeof votes.$inferInsert;

// 8. Sessions (Security & Auth)
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// 9. Audit Logs (Admin Accountability)
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;