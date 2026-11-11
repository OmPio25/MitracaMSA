import {
  pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export type LoginBgType = 'default' | 'preset' | 'image';
export type LoginBgPreset = 'midnight' | 'ocean' | 'emerald' | 'charcoal';
export type CardTheme = 'white' | 'dark' | 'navy' | 'emerald' | 'custom';
export type CardBlur = 'none' | 'sm' | 'md' | 'xl' | '2xl';

export interface AppBrandingValue {
  appName: string;
  appSubtitle: string;
  logoType: 'text' | 'image';
  logoText: string;
  logoUrl?: string | null;
  // Login Background Settings
  loginBgType?: LoginBgType;
  loginBgPreset?: LoginBgPreset;
  loginBgUrl?: string | null;
  loginBgOverlay?: number; // 20 - 90 (%)
  // Card Glassmorphism Customization Settings
  cardTheme?: CardTheme;
  cardColor?: string; // HEX color (e.g. '#ffffff', '#0f172a')
  cardBlur?: CardBlur;
  cardMobileOpacity?: number; // 50 - 100 (%)
  cardDesktopOpacity?: number; // 50 - 100 (%)
  updatedAt?: string;
}

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').$type<AppBrandingValue | Record<string, unknown>>().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  systemSettingsKeyIdx: uniqueIndex('system_settings_key_idx').on(table.key),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updater: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));
