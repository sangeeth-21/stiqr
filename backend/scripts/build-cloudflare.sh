#!/bin/bash
# Cloudflare Build Script for StiQR Backend
# This script builds the NestJS app for Cloudflare Workers deployment

set -e

echo "🔧 Building StiQR Backend for Cloudflare Workers..."

# Clean previous build
rm -rf dist/worker.js dist/worker.js.map

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Build with esbuild for Cloudflare Workers
echo "🏗️  Bundling with esbuild..."
npx esbuild src/worker.ts \
  --bundle \
  --outfile=dist/worker.js \
  --format=esm \
  --platform=browser \
  --target=es2022 \
  --conditions=worker \
  --main-fields=module,main \
  --define:global=globalThis \
  --alias:stream=stream-browserify \
  --alias:events=events \
  --alias:buffer=buffer \
  --external:@prisma/client \
  --external:@prisma/adapter-d1 \
  --external:prisma \
  --external:@nestjs/websockets/socket-module \
  --external:@nestjs/microservices/microservices-module \
  --external:@nestjs/microservices \
  --external:class-transformer/storage \
  --sourcemap \
  --minify=true \
  --tree-shaking=true \
  --resolve-extensions=.ts,.js,.json

# Copy Prisma schema and client for D1 migrations
echo "📋 Copying Prisma files..."
mkdir -p dist/prisma
cp prisma/schema.prisma dist/prisma/
cp -r node_modules/.prisma dist/prisma/client 2>/dev/null || true

echo "✅ Build complete! Output: dist/worker.js"
echo ""
echo "Next steps:"
echo "1. Run: wrangler d1 create stiqr-db"
echo "2. Update wrangler.toml with the database_id"
echo "3. Run: wrangler d1 migrations apply stiqr-db"
echo "4. Run: wrangler deploy"
