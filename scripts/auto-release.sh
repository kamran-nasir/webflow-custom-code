#!/bin/bash
set -e

echo ""
echo "🚀 Change detected..."

# Build/minify
npm run build

# Increment patch version
npm version patch --no-git-tag-version

VERSION=$(node -p "require('./package.json').version")

# Commit everything
git add -A
git commit -m "Release v$VERSION"

# Create version tag
git tag "v$VERSION"

# Push commit + tag
git push origin main
git push origin "v$VERSION"

echo ""
echo "✓ Released v$VERSION"
echo "✓ https://cdn.jsdelivr.net/gh/kamran-nasir/webflow-custom-code@v$VERSION/dist/main.min.js"
echo ""
