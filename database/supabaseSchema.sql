-- Supabase schema (single-file migration)
-- This file is intentionally idempotent (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text UNIQUE NOT NULL,
  "password" text NOT NULL,
  "phone" text,
  "aadhaarNumber" text,
  "selfieImage" text,
  "role" text DEFAULT 'user',
  "isPremium" boolean DEFAULT false,
  "subscriptionPlan" text DEFAULT 'free',
  "referralCode" text,
  "referredById" text,
  "referralBalance" integer DEFAULT 0,
  "referralEarnings" integer DEFAULT 0,
  "createdAt" timestamptz DEFAULT now(),
  "isVerified" boolean DEFAULT false,
  "idDocument" text,
  "googleId" text,
  "credits" integer DEFAULT 0
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralBalance" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralEarnings" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credits" integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS "rooms" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "price" integer NOT NULL,
  "priceLabel" text,
  "billingPeriod" text DEFAULT 'month',
  "deposit" integer NOT NULL,
  "depositLabel" text,
  "location" text NOT NULL,
  "city" text NOT NULL,
  "type" text DEFAULT 'Single Room',
  "images" text NOT NULL,
  "amenities" text NOT NULL,
  "sourceLabel" text,
  "sourceUrl" text,
  "ownerId" text NOT NULL REFERENCES "users"("id"),
  "lat" double precision,
  "lng" double precision,
  "isFeatured" boolean DEFAULT false,
  "isLuxury" boolean DEFAULT false,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "roomId" text NOT NULL REFERENCES "rooms"("id"),
  "rating" integer NOT NULL,
  "comment" text,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" text PRIMARY KEY,
  "senderId" text NOT NULL REFERENCES "users"("id"),
  "receiverId" text NOT NULL REFERENCES "users"("id"),
  "roomId" text REFERENCES "rooms"("id"),
  "content" text NOT NULL,
  "isRead" boolean DEFAULT false,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "services" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "price" integer NOT NULL,
  "priceLabel" text,
  "providerId" text NOT NULL REFERENCES "users"("id"),
  "providerName" text,
  "providerPhone" text,
  "providerEmail" text,
  "city" text NOT NULL,
  "image" text,
  "highlights" text,
  "address" text,
  "sourceUrl" text,
  "whatsappUrl" text,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "saved_rooms" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "roomId" text NOT NULL REFERENCES "rooms"("id"),
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE ("userId", "roomId")
);

CREATE TABLE IF NOT EXISTS "premium_payments" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "amount" numeric NOT NULL DEFAULT 99,
  "utrNumber" text NOT NULL,
  "screenshot" text,
  "status" text DEFAULT 'pending',
  "reviewedBy" text REFERENCES "users"("id"),
  "reviewedAt" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE ("userId", "utrNumber")
);

CREATE TABLE IF NOT EXISTS "support_queries" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "status" text DEFAULT 'not_resolved',
  "adminRepliedAt" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "support_query_messages" (
  "id" text PRIMARY KEY,
  "queryId" text NOT NULL REFERENCES "support_queries"("id"),
  "senderId" text NOT NULL REFERENCES "users"("id"),
  "senderRole" text NOT NULL,
  "text" text NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "referral_transactions" (
  "id" text PRIMARY KEY,
  "referrerId" text NOT NULL REFERENCES "users"("id"),
  "refereeId" text NOT NULL REFERENCES "users"("id"),
  "type" text NOT NULL,
  "amount" integer NOT NULL,
  "roomId" text,
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE ("refereeId", "type")
);

CREATE TABLE IF NOT EXISTS "referral_withdrawals" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "amount" integer NOT NULL,
  "upiId" text NOT NULL,
  "status" text DEFAULT 'pending',
  "adminNote" text,
  "reviewedBy" text REFERENCES "users"("id"),
  "reviewedAt" timestamptz,
  "paidAt" timestamptz,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "room_unlocks" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "roomId" text NOT NULL REFERENCES "rooms"("id"),
  "ownerId" text NOT NULL REFERENCES "users"("id"),
  "status" text DEFAULT 'unlocked',
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE ("userId", "roomId")
);

CREATE TABLE IF NOT EXISTS "credit_transactions" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "amount" integer NOT NULL,
  "type" text NOT NULL,
  "description" text,
  "createdAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_city ON "rooms"("city");
CREATE INDEX IF NOT EXISTS idx_rooms_location ON "rooms"("location");
CREATE INDEX IF NOT EXISTS idx_rooms_price ON "rooms"("price");
CREATE INDEX IF NOT EXISTS idx_messages_sender ON "messages"("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON "messages"("receiverId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON "users"("referralCode");
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON "users"("referredById");
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referrer ON "referral_transactions"("referrerId");
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referee ON "referral_transactions"("refereeId");
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_user ON "referral_withdrawals"("userId");
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_status ON "referral_withdrawals"("status");

CREATE TABLE IF NOT EXISTS "manual_credit_payments" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "users"("id"),
  "packageId" text NOT NULL,
  "amount" numeric NOT NULL,
  "utrNumber" text NOT NULL,
  "screenshot" text,
  "status" text DEFAULT 'pending',
  "reviewedBy" text REFERENCES "users"("id"),
  "reviewedAt" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE ("utrNumber")
);

