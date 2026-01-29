#!/bin/bash

# Database Migration Script
# Run this to backup and migrate to new Supabase project

set -e  # Exit on error

echo "====================================="
echo "Database Migration Script"
echo "====================================="
echo ""

# Step 1: Create backup
echo "Step 1: Creating database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Try to dump database
npx supabase db dump -f "$BACKUP_FILE" --linked 2>/dev/null || {
    echo "⚠️  Automatic backup failed. You'll need to:"
    echo "   1. Go to Supabase Dashboard"
    echo "   2. Navigate to Database → Backups"
    echo "   3. Download the latest backup"
    echo ""
    read -p "Press Enter once you've downloaded the backup..."
}

echo "✅ Backup created: $BACKUP_FILE"
echo ""

# Step 2: Create new project
echo "Step 2: Create new Supabase project"
echo "   1. Go to: https://supabase.com/dashboard"
echo "   2. Login with: vinayak.kapoor@infosecventures.com"
echo "   3. Click 'New Project'"
echo "   4. Name: rag-cascade-compass"
echo "   5. Choose a strong database password (SAVE IT!)"
echo "   6. Wait for project creation (2-3 min)"
echo ""
read -p "Press Enter once project is created..."

# Step 3: Get new credentials
echo ""
echo "Step 3: Enter new project credentials"
read -p "New Project ID: " NEW_PROJECT_ID
read -p "New Project URL (https://xxxxx.supabase.co): " NEW_URL
read -p "New anon/public key: " NEW_ANON_KEY

# Step 4: Update .env
echo ""
echo "Step 4: Updating .env file..."
cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="$NEW_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="$NEW_ANON_KEY"
VITE_SUPABASE_URL="$NEW_URL"
EOF

echo "✅ .env updated"
echo ""

# Step 5: Link to new project
echo "Step 5: Linking to new project..."
npx supabase link --project-ref "$NEW_PROJECT_ID"

# Step 6: Push migrations
echo ""
echo "Step 6: Pushing database schema..."
npx supabase db push

echo ""
echo "====================================="
echo "✅ Migration Complete!"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Go to Supabase Dashboard → SQL Editor"
echo "2. Run the SQL from MIGRATION_TO_RUN.sql"
echo "3. Restart dev server: npm run dev"
echo "4. Test at http://localhost:8080/data"
echo ""
