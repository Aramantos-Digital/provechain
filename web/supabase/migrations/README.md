# Database Migrations

## How to Run Migrations

1. Go to your Supabase project: https://supabase.com/dashboard/project/hphssodcgigaqwfpudjv
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `001_create_proofs_table.sql`
5. Click "Run" to execute the migration

## Migrations

### 001_create_proofs_table.sql
Creates the `proofs` table with:
- User authentication integration
- Row Level Security (RLS) policies
- Indexes for performance
- Automatic timestamp updates

## Verifying the Migration

After running the migration, verify it worked:

```sql
-- Check if table exists
select * from public.proofs limit 1;

-- Check if policies are enabled
select * from pg_policies where tablename = 'proofs';
```

You should see the table structure and three RLS policies.
