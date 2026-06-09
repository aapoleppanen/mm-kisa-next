# Setup Guide

## Recommended infrastructure

| Service | Cost | Purpose |
|---|---|---|
| Cloudflare R2 | ~$0 (within free tier) | Images & assets |
| Neon | Free | PostgreSQL database |
| Vercel | Free (hobby) | Next.js hosting |

---

## 1. Cloudflare R2

1. In Cloudflare dashboard → **R2** → Create bucket named `mm-kisa`
2. Enable **Public access** on the bucket (Settings → Public access → Allow)
3. Note your **Public bucket URL** (e.g. `https://pub-xxx.r2.dev` or add a custom domain)
4. Go to **R2 → Manage R2 API tokens** → Create token with **Object Read & Write** on your bucket
5. Note: Account ID, Access Key ID, Secret Access Key

**Env vars to add:**
```
CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=mm-kisa
R2_PUBLIC_URL=https://pub-xxx.r2.dev          # or custom domain
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev  # same, for client-side
```

To migrate the existing GCS background image, download it and upload to R2, then it will be served from there automatically.

---

## 2. Neon database (replacing Supabase)

1. Sign up at [neon.tech](https://neon.tech) (free)
2. Create project → choose region closest to your users (e.g. `eu-central-1`)
3. Copy **Pooled connection string** → `DATABASE_URL`
4. Copy **Direct connection string** → `DIRECT_URL`

**Migrate your database:**
```bash
# Apply schema to new database
pnpm exec prisma db push

# Then run the better-auth migration
psql $DIRECT_URL < prisma/migrations/20260609_better_auth_and_comments/migration.sql

# Restore your data from backup
psql $DIRECT_URL < backup.sql
```

**Env vars to update:**
```
DATABASE_URL=postgresql://...@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://...@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

---

## 3. Vercel deployment

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add all environment variables (see below)
4. Deploy

---

## Full environment variables

```bash
# Database (Neon)
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...

# Auth (better-auth)
BETTER_AUTH_SECRET=generate_with_openssl_rand_hex_32
BETTER_AUTH_URL=https://your-domain.vercel.app

# GitHub OAuth (create at github.com/settings/developers)
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_secret

# Google OAuth (create at console.cloud.google.com)
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_secret

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=your_cf_account_id
R2_ACCESS_KEY_ID=your_r2_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=mm-kisa
R2_PUBLIC_URL=https://pub-xxx.r2.dev
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Football data API
FD_API_TOKEN=your_football_data_token
```

---

## Removing Prisma Accelerate (optional)

Since Neon has built-in connection pooling, you can remove Accelerate:

1. Remove `@prisma/extension-accelerate` from package.json
2. Update `lib/prisma.ts` to use plain `@prisma/client`
3. Remove `--no-engine` from the `postinstall` script

Or keep Accelerate — it works fine with Neon too.
