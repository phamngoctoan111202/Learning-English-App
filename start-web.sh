#!/bin/bash

# Special English Learning App - Web Server Launcher
# Double-click this file to start the web server

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$SCRIPT_DIR/web"

# Check if web directory exists
if [ ! -d "$WEB_DIR" ]; then
    osascript -e 'display dialog "Web directory not found!" buttons {"OK"} default button 1 with icon stop'
    exit 1
fi

# Change to web directory
cd "$WEB_DIR"

# Kill any existing server on port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start the web server
echo "Starting web server at http://localhost:8080"
echo "Opening browser..."
echo ""
echo "Press Ctrl+C to stop the server"

# Open browser after a short delay
sleep 2 && open "http://localhost:8080" &

# Start Python web server
python3 -m http.server 8080
