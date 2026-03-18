# Nonprofit Donor Database Starter

This repository is now structured as a simple Vercel-ready API backed by PostgreSQL for donor and gift records.

## What is included

- `sql/schema.sql`: the core donor and gift schema
- `api/health.js`: database health check
- `api/donors/index.js`: list and create donor records
- `api/gifts/index.js`: list and create gift records
- `lib/auth.js`: bearer-token protection for every data endpoint

## Security model

- The database connection lives in `DATABASE_URL`, not in source control.
- Every donor and gift endpoint requires `Authorization: Bearer <API_TOKEN>`.
- Gift amounts are stored as integer cents rather than floating point values.
- The schema uses check constraints, foreign keys, and indexes for data integrity.

This is a minimal secure starter, not a complete compliance program. For real nonprofit operations, you should also use least-privilege database credentials, Vercel environment-variable encryption, audit logging, backups, and role-based access in front of this API.

## Recommended stack

- Database: Neon Postgres or Supabase Postgres
- Hosting: Vercel
- Secrets: Vercel project environment variables

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:

   - `DATABASE_URL`
   - `API_TOKEN`

3. Apply `sql/schema.sql` to your Postgres database.

4. Run locally:

   ```bash
   npm run dev
   ```

## Vercel setup

1. In Vercel, import this GitHub repository.
2. Add these environment variables:

   - `DATABASE_URL`
   - `API_TOKEN`

3. Deploy the project.
4. Apply `sql/schema.sql` to the production database.

## Example requests

Create a donor:

```bash
curl -X POST https://your-project.vercel.app/api/donors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "donorType": "INDIVIDUAL",
    "firstName": "Alex",
    "lastName": "Rivera",
    "email": "alex@example.org",
    "city": "Boston",
    "stateProvince": "MA"
  }'
```

Create a gift:

```bash
curl -X POST https://your-project.vercel.app/api/gifts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "donorId": 1,
    "amount": 125.00,
    "giftDate": "2026-03-18",
    "giftType": "ONE_TIME",
    "paymentMethod": "ACH",
    "campaign": "Spring Appeal"
  }'
```

## Important note about existing files

`development.sql` and `production.sql` are preserved as existing exports. The active starter schema for the Vercel API is `sql/schema.sql`.
