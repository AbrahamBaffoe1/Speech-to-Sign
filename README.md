# Speech-to-Sign Language Video System

A real-time system that converts spoken language to sign language video output.

## System Overview

This application captures user speech, converts it to text using ASR, maps it to sign language glosses, and plays corresponding sign language video clips in real-time.

## Architecture

- **Frontend**: React app with microphone input and video player
- **Backend**: Node.js/Express API with ASR and mapping services  
- **Storage**: AWS S3 + CloudFront for video clips
- **ASR**: Real-time speech recognition (Google Speech-to-Text or Whisper)

## Project Structure

```
speech-to-sign/
├── frontend/          # React web application
├── backend/           # Node.js API server
├── data/             # Sign language videos and mappings
├── docs/             # Documentation and guides
└── README.md
```

## MVP Features

- Real-time speech capture
- Speech-to-text conversion
- Text-to-gloss mapping (60 common phrases)
- Seamless video clip playback
- Synchronized captions
- Low latency (<1.5 seconds)

## Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Set Up Google Cloud Speech-to-Text
**Option A - Automated (Recommended):**
```bash
npm run setup-google-web  # Interactive web-based setup
```

**Option B - With Google Cloud CLI:**
```bash
npm run setup-google-cloud  # Fully automated
```

### 3. Start the Application
```bash
npm run dev  # Starts both frontend and backend
```

Visit `http://localhost:3000` to use the application!

## Detailed Setup

For complete setup instructions, see:
- [Google Cloud Setup Guide](docs/GOOGLE_CLOUD_SETUP.md)
- [Video Setup Guide](docs/VIDEO_SETUP.md)
- [AWS S3 Setup Guide](docs/AWS_SETUP.md)

## Technology Stack

- **Frontend**: React, WebRTC, MediaRecorder API
- **Backend**: Node.js, Express, Google Cloud Speech API
- **Storage**: AWS S3, CloudFront CDN
- **Deployment**: Docker, AWS/Heroku