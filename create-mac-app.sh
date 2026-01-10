#!/bin/bash

# Create macOS Application Bundle for Special English Learning App

APP_NAME="Special English Web"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$SCRIPT_DIR/$APP_NAME.app"

echo "Creating macOS app: $APP_NAME.app"

# Create app bundle structure
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Create Info.plist
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launch</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.specialenglish.webapp</string>
    <key>CFBundleName</key>
    <string>Special English Web</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Create launch script
cat > "$APP_DIR/Contents/MacOS/launch" << 'EOF'
#!/bin/bash

# Get the app bundle path
APP_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd ../.. && pwd )"
PROJECT_DIR="$( cd "$APP_PATH/.." && pwd )"
WEB_DIR="$PROJECT_DIR/web"

# Check if web directory exists
if [ ! -d "$WEB_DIR" ]; then
    osascript -e 'display dialog "Web directory not found at: '"$WEB_DIR"'" buttons {"OK"} default button 1 with icon stop'
    exit 1
fi

# Kill any existing server on port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Open Terminal and run server
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    do script "cd '$WEB_DIR' && echo '🚀 Special English Learning App' && echo '📂 Serving: $WEB_DIR' && echo '🌐 URL: http://localhost:8080' && echo '' && echo 'Press Ctrl+C to stop the server' && echo '' && sleep 2 && open 'http://localhost:8080' && python3 -m http.server 8080"
end tell
APPLESCRIPT

exit 0
EOF

# Make launch script executable
chmod +x "$APP_DIR/Contents/MacOS/launch"

# Create a simple icon (using emoji as text)
# For a real icon, you'd need to create an .icns file
cat > "$APP_DIR/Contents/Resources/AppIcon.icns" << 'EOF'
This is a placeholder. For a real icon, create an .icns file.
EOF

echo "✅ App created successfully!"
echo "📍 Location: $APP_DIR"
echo ""
echo "To use:"
echo "  1. Double-click '$APP_NAME.app' to launch"
echo "  2. Or drag it to your Applications folder"
echo "  3. Or add to Dock for quick access"
echo ""
echo "Note: You may need to allow the app in System Preferences > Security & Privacy"

# Open Finder to show the app
open "$SCRIPT_DIR"
