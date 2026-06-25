# Grocery POS — Deployment Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**, name it `grocery-pos`
3. Choose a region close to your store
4. Wait for the project to be created (~1 minute)

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `supabase-schema.sql`
4. Click **Run** — this creates all tables and adds sample products

## Step 3: Set Up Users (Cashiers)

1. In Supabase dashboard, go to **Authentication → Users**
2. Click **Add User** for each cashier/staff member
3. Enter their email and a password
4. They will use these credentials to log in to the POS

## Step 4: Get Your Supabase Keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

## Step 5: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repo (push the `grocery-pos` folder to GitHub first)
   - Or use Vercel CLI: `npx vercel` inside the folder
4. During setup, add these **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**

## Step 6: Done!

Share the Vercel URL with your cashiers. They log in with the credentials you created in Step 3.

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local and add your keys
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

# Start dev server
npm run dev
# Open http://localhost:3000
```

## Features Overview

| Page | URL | What it does |
|------|-----|--------------|
| POS Terminal | `/dashboard` | Scan/search items, build cart, complete sale |
| Products | `/products` | Add/edit/delete products and stock levels |
| Sales History | `/history` | View all transactions, print receipts, daily stats |

## Tip: Low Stock Alerts

Products with fewer than 5 units remaining show a red badge on the POS terminal and products page.
