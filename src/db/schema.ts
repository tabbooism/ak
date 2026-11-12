import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const driveActivityLogs = pgTable('drive_activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  action: text('action').notNull(),
  fileName: text('file_name'),
  fileId: text('file_id'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  driveActivityLogs: many(driveActivityLogs),
}));

export const driveActivityLogsRelations = relations(driveActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [driveActivityLogs.userId],
    references: [users.id],
  }),
}));
