# 🚀 Deployment Guide: Render + Supabase

This guide walks you through deploying the Fantasy Football Blind Auction app to **Render** (hosting) and **Supabase** (database).

## Prerequisites

- GitHub account with this repository
- Supabase account (free tier works)
- Render account (free tier works)

---

## Part 1: Supabase Database Setup

### 1. Create/Verify Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in and create a new project (or use existing one)
3. Wait for project provisioning to complete

### 2. Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Run each migration file in order:
   - `supabase_migrations/001_create_games_table.sql`
   - `supabase_migrations/002_create_game_functions.sql`
   - `supabase_migrations/003_fix_ambiguous_column.sql`
   - `supabase_migrations/004_add_game_settings.sql`
   - `supabase_migrations/005_add_end_game_function.sql`

3. Verify tables were created:
   ```sql
   SELECT * FROM games LIMIT 1;
   SELECT * FROM game_players LIMIT 1;
   ```

### 3. Get Your Supabase Credentials

1. Go to **Project Settings** > **API**
2. Copy these values (you'll need them for Render):
   - **Project URL** (`SUPABASE_URL`)
   - **anon public** key (`SUPABASE_ANON_KEY`)
   - **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`) ⚠️ Keep this secret!

---

## Part 2: Render Deployment

### 1. Push Code to GitHub

Make sure your latest code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Create Render Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **New** > **Web Service**
3. Connect your GitHub repository
4. Configure the service:

   **Basic Settings:**
   - **Name**: `fantasy-football-auction` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: `Node`

   **Build & Deploy:**
   - **Build Command**:
     ```
     npm install && npm run build
     ```
   - **Start Command**:
     ```
     npm start
     ```

   **Instance Type:**
   - Free tier is fine for testing (sleeps after 15 min inactivity)
   - Upgrade to paid for production (always-on)

### 3. Add Environment Variables

In the Render dashboard, go to **Environment** tab and add these variables:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render's default) |

⚠️ **Important**: Make sure to paste the exact values from your Supabase dashboard.

### 4. Deploy

1. Click **Create Web Service**
2. Render will automatically deploy your app
3. Watch the deployment logs for any errors
4. Once deployed, you'll get a URL like: `https://fantasy-football-auction.onrender.com`

---

## Part 3: Verify Deployment

### 1. Test the Application

1. Visit your Render URL
2. Try signing up for a new account
3. Create a game
4. Open in another browser/incognito window
5. Join the game with a second player
6. Test the auction functionality

### 2. Check Logs

If something doesn't work:
- **Render**: View logs in the Render dashboard under **Logs** tab
- **Supabase**: Check **Database** > **Query Performance** for DB errors

---

## Common Issues & Solutions

### ❌ "Failed to connect to database"
- Verify your Supabase credentials in Render environment variables
- Check that migrations ran successfully in Supabase SQL Editor

### ❌ "Build failed" on Render
- Check the build logs for specific error
- Ensure `package.json` has correct dependencies
- Try running `npm run build` locally first

### ❌ Socket.IO connection fails
- This is normal on Render free tier (cold starts)
- Upgrade to paid tier for always-on service
- Check CORS settings in `server.js`

### ❌ "playerList.csv not found"
- Make sure `playerList.csv` is committed to your repository
- Verify it's in the root directory

### ❌ Players not loading
- Check that `playerList.csv` has valid format
- View server logs in Render for CSV parsing errors

---

## Updating the Deployment

When you make changes:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically detect the push and redeploy (if auto-deploy is enabled).

---

## Monitoring & Maintenance

### Update Player Data Weekly

1. Update `playerList.csv` with current week's projections
2. Commit and push to GitHub
3. Render will automatically redeploy

### Database Backups

Supabase automatically backs up your database. To manually export:
1. Go to **Database** > **Backups** in Supabase dashboard
2. Download a backup

### Scaling

If your app gets popular:
- **Render**: Upgrade to paid tier for better performance
- **Supabase**: Monitor usage in dashboard; free tier has limits
- Consider adding Redis for Socket.IO scaling (multiple Render instances)

---

## Cost Estimate

**Free Tier (Testing):**
- Supabase: Free for up to 500MB database, 2GB bandwidth/month
- Render: Free but sleeps after 15min inactivity

**Paid (Production):**
- Supabase Pro: $25/month (8GB database, 50GB bandwidth)
- Render Starter: $7/month (always-on, 512MB RAM)
- **Total**: ~$32/month for production-ready setup

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Socket.IO on Render**: https://render.com/docs/deploy-socketio

---

**Happy deploying!** 🎉🏈
