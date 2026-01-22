CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"full_name" varchar,
	"role" varchar DEFAULT 'user',
	"membership_type" varchar DEFAULT 'general',
	"picture" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
