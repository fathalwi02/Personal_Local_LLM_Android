#!/bin/bash
# ============================================
# Fath-AI Mobile - Bundle Creator
# Creates a portable package for Android/Termux
# ============================================

set -e

echo ""
echo "📦 Bundling Fath-AI for Android..."
echo "==================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create excludes file
cat > .bundle_excludes.txt << EOF
node_modules
.next
.git
.gitignore
.DS_Store
*.log
*.tar.gz
.bundle_excludes.txt
tsconfig.tsbuildinfo
EOF

echo "📁 Files to include:"
echo "   - web-ui/ (source code)"
echo "   - start.sh (launcher)"
echo "   - termux_setup.sh (setup script)"
echo "   - DEPLOY_TO_PHONE.md (guide)"
echo ""

# Create the bundle
echo "🔨 Creating archive..."
tar -cvzf fath-ai-mobile.tar.gz \
    --exclude-from=.bundle_excludes.txt \
    web-ui \
    start.sh \
    termux_setup.sh \
    DEPLOY_TO_PHONE.md

# Cleanup
rm .bundle_excludes.txt

# Get bundle size
BUNDLE_SIZE=$(du -h fath-ai-mobile.tar.gz | cut -f1)

echo ""
echo "============================================"
echo "✅ Bundle created successfully!"
echo "============================================"
echo ""
echo "📦 File: fath-ai-mobile.tar.gz"
echo "📊 Size: $BUNDLE_SIZE"
echo ""
echo "📱 Next steps:"
echo "   1. Transfer fath-ai-mobile.tar.gz to your phone's Downloads folder"
echo "   2. Open Termux on your phone"
echo "   3. Run: pkg update && pkg install wget"
echo "   4. Run: cd ~/storage/downloads && bash termux_setup.sh"
echo ""
echo "📖 Or follow the detailed guide: DEPLOY_TO_PHONE.md"
echo ""
