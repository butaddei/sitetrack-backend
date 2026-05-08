#!/bin/bash
set -e

echo "=== Ensuring CocoaPods is accessible ==="

# Find pod in common locations
POD_BIN=""
for loc in /usr/local/bin/pod /opt/homebrew/bin/pod /usr/bin/pod; do
  if [ -x "$loc" ]; then
    POD_BIN="$loc"
    echo "Found pod at: $loc"
    break
  fi
done

# If not found in known paths, try which
if [ -z "$POD_BIN" ]; then
  POD_BIN=$(which pod 2>/dev/null || true)
  if [ -n "$POD_BIN" ]; then
    echo "Found pod via which: $POD_BIN"
  fi
fi

# If still not found, install via gem
if [ -z "$POD_BIN" ]; then
  echo "pod not found, installing via gem..."
  sudo gem install cocoapods --no-document
  POD_BIN=$(which pod 2>/dev/null || find /usr/local/lib/ruby /Library/Ruby/Gems -name pod -type f 2>/dev/null | head -1 || true)
  echo "Installed pod at: $POD_BIN"
fi

# Ensure pod is accessible at /usr/local/bin/pod (standard PATH for Node.js spawn)
if [ -n "$POD_BIN" ] && [ "$POD_BIN" != "/usr/local/bin/pod" ]; then
  echo "Creating symlink: /usr/local/bin/pod -> $POD_BIN"
  sudo ln -sf "$POD_BIN" /usr/local/bin/pod 2>/dev/null || ln -sf "$POD_BIN" /usr/local/bin/pod 2>/dev/null || true
fi

echo "pod version: $(/usr/local/bin/pod --version 2>/dev/null || pod --version 2>/dev/null || echo 'WARN: pod not found at /usr/local/bin/pod')"
echo "=== CocoaPods setup complete ==="
