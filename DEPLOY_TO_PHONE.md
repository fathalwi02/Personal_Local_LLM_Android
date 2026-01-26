# 📱 Fath-AI Mobile Deployment Guide

## Complete guide to run Fath-AI on your Android phone via Termux

---

## 🎯 Optimized for Poco F4

Your **Poco F4** with **Snapdragon 870** is excellent for local LLMs!

| Recommended Model | RAM Usage | Quality | Speed |
|-------------------|-----------|---------|-------|
| **Qwen2-1.5B** (default) | ~2.5GB | Good | Fast ⚡ |
| Phi-3-mini | ~3.5GB | Better | Medium |
| TinyLlama 1.1B | ~1.5GB | Basic | Very Fast |

**Recommended settings for Poco F4:**
- Threads: 4-6 (Snapdragon 870 has 8 cores)
- Context: 2048 tokens
- Model: Qwen2-1.5B Q4_K_M

---

## 📋 Prerequisites

- Android phone with **ARM64** processor ✅ (Snapdragon 870)
- At least **4GB RAM** ✅ (Poco F4 has 6-8GB)
- **5GB+ free storage**
- Termux app installed

---
o
# 🚀 FIRST TIME SETUP

## Step 1: Install Termux

1. **Download Termux** from [F-Droid](https://f-droid.org/en/packages/com.termux/)
   - ⚠️ **DO NOT** use the Play Store version (it's outdated)
   
2. Open Termux and run initial setup:
```bash
pkg update && pkg upgrade -y
termux-setup-storage
```
   - Tap "Allow" when prompted

---

## Step 2: Install Ollama

```bash
pkg install ollama
```

---

## Step 3: Install Debian (proot-distro)

```bash
pkg install proot-distro
proot-distro install debian
```

---

## Step 4: Download Model

```bash
# Start Ollama server
ollama serve
```

In a **new Termux session** (swipe left → New session):
```bash
ollama pull qwen2:1.5b
```

Wait for download to complete (~1GB).

---

## Step 5: Transfer & Extract Bundle

1. Transfer `fath-ai-mobile.tar.gz` to your phone's Download folder
2. In Termux:
```bash
mkdir -p ~/fath-ai && cd ~/fath-ai
tar -xzf ~/storage/shared/"Android Local LLM"/fath-ai-mobile.tar.gz
```

---

## Step 6: Setup Web UI in Debian

```bash
# Enter Debian
proot-distro login debian

# Install Node.js
apt update && apt install -y nodejs npm

# Go to web-ui
cd /data/data/com.termux/files/home/fath-ai/web-ui

# Create config
cat > next.config.js << 'EOF'
module.exports = {
  transpilePackages: ['react-syntax-highlighter', 'pdf-parse'],
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  }
};
EOF

# Install dependencies
npm install

# Install correct Next.js version
npm install next@14.2.3 --legacy-peer-deps
```

---

# ⚡ QUICK START (Everyday Use)

After initial setup, use these commands to start Fath-AI:

## Session 1: Start Ollama (Native Termux)
```bash
ollama serve
```

## Session 2: Start Web UI (Debian)
```bash
proot-distro login debian
cd /data/data/com.termux/files/home/fath-ai/web-ui
npx next dev -p 3000
```

## Session 3: Open Browser
Navigate to: **http://localhost:3000**

---

# 🛑 Stopping Everything

```bash
# Kill all processes
pkill -f ollama
pkill -f next
pkill -f node
```

Or just close Termux completely.

---

# 🔧 Troubleshooting

### "Connection refused" error in UI
→ Make sure Ollama is running: `ollama serve`

### Model not found
→ Change model in UI dropdown to `qwen2:1.5b`

### Port already in use
```bash
pkill -f next
npx next dev -p 3000
```

### "Permission denied"
```bash
chmod +x start.sh
```

### Low memory / slow performance
- Use smaller model (TinyLlama)
- Close other apps
- Reduce context size

---

# 📝 One-Line Quick Commands

Save these for easy copy-paste:

**Start Ollama:**
```bash
ollama serve
```

**Start Web UI:**
```bash
proot-distro login debian && cd /data/data/com.termux/files/home/fath-ai/web-ui && npx next dev -p 3000
```

---

## 🎉 Done!

You now have a fully local LLM running on your phone! No internet required after setup.
