#!/bin/bash

# PCB Automation Start Script
# This script starts both backend and frontend servers

echo "🚀 Starting PCB Automation Application..."
echo ""

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to get local IP address
get_local_ip() {
    # Try different methods to get local IP
    if command -v ip &> /dev/null; then
        # Linux with ip command
        ip route get 1.1.1.1 | grep -oP 'src \K\S+' 2>/dev/null || \
        ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n1
    elif command -v ifconfig &> /dev/null; then
        # macOS or Linux with ifconfig
        ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -n1
    elif command -v hostname &> /dev/null; then
        # Fallback to hostname
        hostname -I 2>/dev/null | awk '{print $1}' || hostname -i 2>/dev/null | awk '{print $1}'
    else
        echo "localhost"
    fi
}

# Get local IP
LOCAL_IP=$(get_local_ip)
if [ -z "$LOCAL_IP" ] || [ "$LOCAL_IP" == "127.0.0.1" ]; then
    LOCAL_IP="localhost"
fi

echo "🌐 Detected Local IP: $LOCAL_IP"
echo ""

# Ask user if they want to use local IP or localhost
if [ "$LOCAL_IP" != "localhost" ]; then
    echo "Choose network configuration:"
    echo "1) Use localhost (local machine only)"
    echo "2) Use $LOCAL_IP (accessible from network)"
    echo ""
    read -p "Enter choice (1 or 2) [default: 2]: " CHOICE
    CHOICE=${CHOICE:-2}
    
    if [ "$CHOICE" == "1" ]; then
        API_HOST="localhost"
    else
        API_HOST="$LOCAL_IP"
    fi
else
    API_HOST="localhost"
fi

echo ""
echo "📝 Configuring environment files..."

# Update backend .env
cd "$SCRIPT_DIR/backend"
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || true
fi
if [ -f ".env" ]; then
    # Update or add FRONTEND_URL
    if grep -q "^FRONTEND_URL=" .env; then
        sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=http://$API_HOST:5173|" .env
    else
        echo "FRONTEND_URL=http://$API_HOST:5173" >> .env
    fi
fi

# Update frontend .env
cd "$SCRIPT_DIR/frontend"
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || true
fi
if [ -f ".env" ]; then
    # Update or add VITE_API_URL
    if grep -q "^VITE_API_URL=" .env; then
        sed -i.bak "s|^VITE_API_URL=.*|VITE_API_URL=http://$API_HOST:5000|" .env
    else
        echo "VITE_API_URL=http://$API_HOST:5000" >> .env
    fi
fi

echo "✅ Configuration complete!"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start Backend
echo "📦 Starting Backend Server..."
cd "$SCRIPT_DIR/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    npm install
fi

node server.js &
BACKEND_PID=$!
echo "✅ Backend server started (PID: $BACKEND_PID)"
echo ""

# Wait a bit for backend to start
sleep 2

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd "$SCRIPT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    pnpm install
fi

pnpm dev &
FRONTEND_PID=$!
echo "✅ Frontend server starting... (PID: $FRONTEND_PID)"
echo ""

# Wait for frontend to start
sleep 3

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Application is running!"
echo ""
echo "📍 Local Access:"
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:5173"

if [ "$API_HOST" != "localhost" ]; then
    echo ""
    echo "🌐 Network Access:"
    echo "   Backend:  http://$API_HOST:5000"
    echo "   Frontend: http://$API_HOST:5173"
fi

echo ""
echo "Press Ctrl+C to stop all servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# # Open browser (optional, uncomment based on your OS)
# if [[ "$OSTYPE" == "linux-gnu"* ]]; then
#     # Linux
#     if command -v xdg-open &> /dev/null; then
#         xdg-open http://$API_HOST:5173 &> /dev/null &
#     fi
# elif [[ "$OSTYPE" == "darwin"* ]]; then
#     # macOS
#     open http://$API_HOST:5173 &> /dev/null &
# fi

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
