#!/data/data/com.termux/files/usr/bin/bash
# ============================================
# Fath-AI Mobile - Termux Setup Script
# Run this script INSIDE Termux on your phone
# ============================================

set -e

echo "🚀 Fath-AI Mobile Setup for Termux"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run inside Termux!"
    exit 1
fi

# Step 1: Update packages
print_step "Updating Termux packages..."
pkg update -y && pkg upgrade -y
print_success "Packages updated"

# Step 2: Install dependencies
print_step "Installing Node.js and build tools..."
pkg install -y nodejs-lts git wget curl cmake clang make
print_success "Dependencies installed"

# Step 3: Setup storage if not already done
print_step "Setting up storage access..."
if [ ! -d "$HOME/storage" ]; then
    termux-setup-storage
    sleep 2
fi
print_success "Storage access configured"

# Step 4: Create project directory
FATH_DIR="$HOME/fath-ai"
print_step "Creating project directory at $FATH_DIR..."
mkdir -p "$FATH_DIR"
print_success "Directory created"

# Step 5: Check for bundle file
BUNDLE_LOCATIONS=(
    "$HOME/storage/downloads/fath-ai-mobile.tar.gz"
    "$HOME/storage/shared/Download/fath-ai-mobile.tar.gz"
    "$HOME/storage/dcim/fath-ai-mobile.tar.gz"
    "/sdcard/Download/fath-ai-mobile.tar.gz"
)

BUNDLE_FOUND=""
for loc in "${BUNDLE_LOCATIONS[@]}"; do
    if [ -f "$loc" ]; then
        BUNDLE_FOUND="$loc"
        break
    fi
done

if [ -n "$BUNDLE_FOUND" ]; then
    print_step "Found bundle at: $BUNDLE_FOUND"
    print_step "Extracting bundle..."
    cd "$FATH_DIR"
    tar -xzf "$BUNDLE_FOUND"
    print_success "Bundle extracted"
else
    print_warning "Bundle not found! Please transfer fath-ai-mobile.tar.gz to your Downloads folder"
    print_warning "Then run: tar -xzf ~/storage/downloads/fath-ai-mobile.tar.gz -C ~/fath-ai/"
fi

# Step 6: Build llama.cpp
print_step "Building llama.cpp for Android ARM64..."
cd "$FATH_DIR"
if [ ! -d "llama.cpp" ]; then
    git clone --depth 1 https://github.com/ggerganov/llama.cpp.git
fi
cd llama.cpp
make clean 2>/dev/null || true
make -j$(nproc)
print_success "llama.cpp built successfully"

# Step 7: Download model
print_step "Do you want to download Qwen2-1.5B model? (~1GB) [y/N]"
read -r download_model

if [[ "$download_model" =~ ^[Yy]$ ]]; then
    print_step "Downloading Qwen2-1.5B-Instruct..."
    cd "$FATH_DIR"
    wget -c -O qwen2-1_5b-instruct-q4_k_m.gguf \
        "https://huggingface.co/Qwen/Qwen2-1.5B-Instruct-GGUF/resolve/main/qwen2-1_5b-instruct-q4_k_m.gguf"
    print_success "Model downloaded"
else
    print_warning "Skipping model download. You'll need to download a GGUF model manually."
fi

# Step 8: Install npm dependencies
if [ -d "$FATH_DIR/web-ui" ]; then
    print_step "Installing Node.js dependencies..."
    cd "$FATH_DIR/web-ui"
    npm install
    print_success "Dependencies installed"
    
    print_step "Building Next.js app..."
    npm run build
    print_success "Build complete"
fi

# Step 9: Make start script executable
if [ -f "$FATH_DIR/start.sh" ]; then
    chmod +x "$FATH_DIR/start.sh"
fi

# Done!
echo ""
echo "============================================"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "============================================"
echo ""
echo "To start Fath-AI, run:"
echo -e "  ${YELLOW}cd ~/fath-ai && ./start.sh${NC}"
echo ""
echo "Then open in your browser:"
echo -e "  ${BLUE}http://localhost:3002${NC}"
echo ""
