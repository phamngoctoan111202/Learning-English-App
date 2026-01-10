#!/bin/bash

# Script to bump version numbers in index.html
# Usage: ./bump-version.sh 1.2

if [ -z "$1" ]; then
    echo "Usage: ./bump-version.sh <new-version>"
    echo "Example: ./bump-version.sh 1.2"
    exit 1
fi

NEW_VERSION=$1

# Get current version from index.html
CURRENT_VERSION=$(grep -o '?v=[0-9.]*' index.html | head -1 | sed 's/?v=//')

echo "🔄 Bumping version: $CURRENT_VERSION → $NEW_VERSION"

# Replace all version strings in index.html
sed -i.bak "s/?v=$CURRENT_VERSION/?v=$NEW_VERSION/g" index.html

# Remove backup file
rm index.html.bak

echo "✅ Version updated successfully!"
echo ""
echo "📝 Don't forget to:"
echo "   1. Update VERSION.md with changelog"
echo "   2. Test the changes in browser"
echo "   3. Commit with message: 'chore: bump version to v$NEW_VERSION'"
