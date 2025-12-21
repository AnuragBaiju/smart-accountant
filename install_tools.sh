#!/bin/bash

echo "🚀 Starting Smart Accountant Setup..."

# 1. Install Homebrew (The App Store for Code)
# Checks if you have it. If not, installs it.
if ! command -v brew &> /dev/null; then
    echo "🍺 Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to your PATH so your terminal can see it
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
else
    echo "✅ Homebrew is already installed."
fi

# 2. Install Python 3.12 (The Language for Backend)
echo "🐍 Installing Python 3.12..."
brew install python@3.12

# 3. Install Node.js (The Language for Frontend)
echo "📦 Installing Node.js..."
brew install node

# 4. Install AWS CLI (The Tool to talk to AWS)
echo "☁️ Installing AWS CLI..."
brew install awscli

# 5. Install AWS SAM CLI (The Tool to build Serverless apps)
echo "🐿️ Installing AWS SAM CLI..."
brew install aws-sam-cli

echo "🎉 Installation Complete! Please restart your terminal."