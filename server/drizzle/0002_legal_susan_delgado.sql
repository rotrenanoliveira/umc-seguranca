CREATE TABLE "access_logs" (
	"log_id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"ip" text NOT NULL,
	"method" text NOT NULL,
	"url" text NOT NULL,
	"status_code" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
