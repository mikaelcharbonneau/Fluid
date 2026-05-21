-- Brand table: one row per saved brand identity. `userId` references the
-- Supabase auth user (auth.users.id). Identifiers are quoted to preserve the
-- camelCase casing the application queries by.
create table if not exists "Brand" (
    "id" text not null,
    "userId" uuid not null,
    "name" text not null,
    "about" text not null,
    "audience" text not null,
    "difference" text,
    "competitors" text[],
    "styleDirection" text,
    "strategy" jsonb not null,
    "selectedName" text,
    "selectedStyle" text,
    "selectedLogo" text,
    "createdAt" timestamp(3) not null default current_timestamp,
    "updatedAt" timestamp(3) not null,
    constraint "Brand_pkey" primary key ("id")
);

create index if not exists "Brand_userId_idx" on "Brand" ("userId");
