-- Row Level Security for the Brand table. The application now reads and writes
-- through the Supabase client using the user's session (the `authenticated`
-- role), so ownership must be enforced by the database. Each policy restricts
-- access to rows the requesting user owns (auth.uid() = "userId"). There is no
-- UPDATE policy because the application never updates a brand after creation.
alter table "Brand" enable row level security;

create policy "Brands are viewable by their owner"
  on "Brand" for select
  to authenticated
  using ((select auth.uid()) = "userId");

create policy "Brands are insertable by their owner"
  on "Brand" for insert
  to authenticated
  with check ((select auth.uid()) = "userId");

create policy "Brands are deletable by their owner"
  on "Brand" for delete
  to authenticated
  using ((select auth.uid()) = "userId");
