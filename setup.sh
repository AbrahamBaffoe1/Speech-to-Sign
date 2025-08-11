#!/bin/bash

# Speech-to-Sign Language System Setup Script
echo "🎤 Setting up Speech-to-Sign Language System..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. You have version $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Copy environment file
echo
echo "⚙️  Setting up environment configuration..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
    echo "⚠️  Please edit backend/.env with your API credentials"
else
    echo "✅ backend/.env already exists"
fi

# Create data directories
echo
echo "📁 Creating data directories..."
mkdir -p data/videos
mkdir -p data/temp
echo "✅ Data directories created"

# Check for required tools
echo
echo "🔍 Checking for optional tools..."

if command -v docker &> /dev/null; then
    echo "✅ Docker detected - can use containerized deployment"
else
    echo "⚠️  Docker not found - install Docker for easy deployment"
fi

if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg detected - video processing available"
else
    echo "⚠️  FFmpeg not found - install for video processing features"
fi

# Display next steps
echo
echo "🎉 Setup complete!"
echo
echo "Next steps:"
echo "1. Configure your API credentials in backend/.env:"
echo "   - Google Cloud Speech API key (or OpenAI API key)"
echo "   - AWS credentials for S3 storage"
echo
echo "2. Add sign language videos to data/videos/ directory"
echo
echo "3. Start the development servers:"
echo "   npm run dev"
echo
echo "4. Or build and start for production:"
echo "   npm run build && npm start"
echo
echo "5. Or use Docker:"
echo "   docker-compose up --build"
echo
echo "📖 See README.md for detailed documentation"
echo