#!/bin/bash
# Cloudflare Deployment Script for StiQR Backend
# Prerequisites: wrangler login, Cloudflare account with D1 and R2 enabled

set -e

echo "🚀 Deploying StiQR Backend to Cloudflare..."
echo ""

# Check wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler not found. Install with: npm install -g wrangler"
    exit 1
fi

# Check wrangler is logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in. Run: wrangler login"
    exit 1
fi

echo "✅ Wrangler authenticated"
echo ""

# Step 1: Create D1 Database
echo "📦 Step 1: Creating D1 Database..."
D1_OUTPUT=$(wrangler d1 create stiqr-db 2>&1)
echo "$D1_OUTPUT"

# Extract database_id from output
D1_ID=$(echo "$D1_OUTPUT" | grep -o '"database_id": "[^"]*"' | cut -d'"' -f4)
if [ -z "$D1_ID" ]; then
    D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)
fi

if [ -n "$D1_ID" ]; then
    echo "📝 Updating wrangler.toml with D1 database_id: $D1_ID"
    sed -i.bak "s/YOUR_D1_DATABASE_ID/$D1_ID/" wrangler.toml
    rm -f wrangler.toml.bak
else
    echo "⚠️  Could not extract D1 ID. Please update wrangler.toml manually."
    echo "   Run: wrangler d1 create stiqr-db"
    echo "   Copy the database_id to wrangler.toml"
fi

echo ""

# Step 2: Run D1 Migrations
echo "🗄️  Step 2: Setting up D1 Database Schema..."
npx prisma generate
wrangler d1 execute stiqr-db --file=./prisma/schema.prisma --remote 2>&1 || echo "⚠️  D1 migration may need manual setup"

echo ""

# Step 3: Create R2 Bucket
echo "📦 Step 3: Creating R2 Bucket..."
wrangler r2 bucket create stiqr-storage 2>&1 || echo "⚠️  R2 bucket may already exist"

echo ""

# Step 4: Set Environment Secrets
echo "🔑 Step 4: Setting Environment Secrets..."
echo "Please set the following secrets via Wrangler or Cloudflare Dashboard:"
echo "  wrangler secret put JWT_SECRET"
echo "  wrangler secret put DATABASE_URL"
echo "  wrangler secret put REDIS_URL"
echo ""

# Step 5: Build
echo "🏗️  Step 5: Building for Cloudflare..."
bash scripts/build-cloudflare.sh

echo ""

# Step 6: Deploy
echo "🚀 Step 6: Deploying to Cloudflare Workers..."
wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Your StiQR Backend URLs:"
echo "   API: https://stiqr-backend.YOUR_SUBDOMAIN.workers.dev/api"
echo "   Docs: https://stiqr-backend.YOUR_SUBDOMAIN.workers.dev/docs"
echo ""
echo "📊 Cloudflare Dashboard:"
echo "   Workers: https://dash.cloudflare.com → Workers & Pages"
echo "   D1: https://dash.cloudflare.com → D1"
echo "   R2: https://dash.cloudflare.com → R2"
