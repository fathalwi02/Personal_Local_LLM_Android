#!/usr/bin/env bash
# ============================================
# Fath-AI Mobile - Start Script
# Works on both Linux PC and Android/Termux
# ============================================

set -e

echo ""
echo "🚀 Starting Fath-AI Mobile..."
echo "=============================="

# Get the directory where this script is located
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

# Configuration
PORT_LLM=11434
PORT_UI=3002
MODEL_FILE="qwen2-1_5b-instruct-q4_k_m.gguf"
THREADS=$(nproc 2>/dev/null || echo 4)
CONTEXT_SIZE=2048

# Detect environment
if [ -d "/data/data/com.termux" ]; then
    echo "📱 Running in Termux (Android)"
    IS_TERMUX=true
    # Use fewer threads on mobile to prevent overheating
    THREADS=$((THREADS > 4 ? 4 : THREADS))
    CONTEXT_SIZE=1024
else
    echo "💻 Running on Linux"
    IS_TERMUX=false
fi

# Parse arguments
UI_ONLY=false
for arg in "$@"; do
    case $arg in
        --ui-only)
            UI_ONLY=true
            echo "🎨 UI Only Mode: Skipping LLM Server..."
            ;;
        --threads=*)
            THREADS="${arg#*=}"
            ;;
        --context=*)
            CONTEXT_SIZE="${arg#*=}"
            ;;
    esac
done

# Kill any existing processes
cleanup_existing() {
    echo "🧹 Cleaning up existing processes..."
    pkill -f "llama-server" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    sleep 1
}

cleanup_existing

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Fath-AI..."
    [ -n "$LLM_PID" ] && kill $LLM_PID 2>/dev/null
    [ -n "$WEBUI_PID" ] && kill $WEBUI_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start LLM Server
if [ "$UI_ONLY" = false ]; then
    # Check if model exists
    if [ ! -f "$MODEL_FILE" ]; then
        echo "❌ Model not found: $MODEL_FILE"
        echo "   Please download a GGUF model first."
        echo "   See DEPLOY_TO_PHONE.md for download instructions."
        exit 1
    fi

    # Check if llama-server exists
    LLAMA_SERVER=""
    if [ -f "./llama.cpp/llama-server" ]; then
        LLAMA_SERVER="./llama.cpp/llama-server"
    elif [ -f "./llama.cpp/build/bin/llama-server" ]; then
        LLAMA_SERVER="./llama.cpp/build/bin/llama-server"
    elif command -v llama-server &> /dev/null; then
        LLAMA_SERVER="llama-server"
    fi

    if [ -z "$LLAMA_SERVER" ]; then
        echo "❌ llama-server not found!"
        echo "   Please build llama.cpp first."
        exit 1
    fi

    echo "📦 Starting LLM Server..."
    echo "   Model: $MODEL_FILE"
    echo "   Threads: $THREADS"
    echo "   Context: $CONTEXT_SIZE"
    
    $LLAMA_SERVER \
        -m "$MODEL_FILE" \
        --host 127.0.0.1 \
        --port $PORT_LLM \
        --api-oai \
        -c $CONTEXT_SIZE \
        --threads $THREADS \
        > llm.log 2>&1 &

    LLM_PID=$!
    echo "   ✓ LLM Server started (PID: $LLM_PID)"
    
    # Wait for LLM server to be ready
    echo "   ⏳ Waiting for LLM server..."
    for i in {1..30}; do
        if curl -s "http://127.0.0.1:$PORT_LLM/health" > /dev/null 2>&1; then
            echo "   ✓ LLM server ready!"
            break
        fi
        sleep 1
    done
else
    LLM_PID=""
fi

# Start Web UI
echo ""
echo "🌐 Starting Web UI..."
cd web-ui

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing dependencies..."
    npm install
fi

# Check if build exists (for production mode)
if [ ! -d ".next" ]; then
    echo "   🔨 Building Next.js app..."
    npm run build
fi

npm start > ../webui.log 2>&1 &
WEBUI_PID=$!
cd ..

echo "   ✓ Web UI started (PID: $WEBUI_PID)"

# Wait for UI to be ready
sleep 3

echo ""
echo "============================================"
echo "✅ Fath-AI Mobile is running!"
echo "============================================"
echo ""
echo "🌐 Open in browser: http://localhost:$PORT_UI"
echo ""
if [ "$UI_ONLY" = false ]; then
    echo "📊 LLM Server: http://localhost:$PORT_LLM"
fi
echo ""
echo "📝 Logs:"
echo "   - LLM: $PROJECT_DIR/llm.log"
echo "   - UI:  $PROJECT_DIR/webui.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running and wait for processes
wait
