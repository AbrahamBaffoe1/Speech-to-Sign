# Getting Started with Speech-to-Sign Language System

Welcome to the Speech-to-Sign Language Video System! This guide will help you get up and running quickly.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for version control)

### 1. Initial Setup
```bash
cd ~/Desktop/speech-to-sign
./setup.sh
```

This will:
- ✅ Install all dependencies
- ✅ Create environment files
- ✅ Set up data directories
- ✅ Create sample video placeholders

### 2. Configure API Keys
Edit `backend/.env` with your credentials:

```bash
# Google Cloud Speech-to-Text (Recommended)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# OR OpenAI Whisper (Alternative)
OPENAI_API_KEY=your_openai_api_key

# AWS S3 for video storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your-bucket-name
```

### 3. Set Up Videos
```bash
# Create video placeholders and guidelines
npm run setup-videos

# Convert raw video files (requires FFmpeg)
npm run convert-video input.mov OUTPUT-NAME.mp4

# Upload to S3 (optional)
npm run setup-s3
npm run upload-videos
```

### 4. Start Development
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:3001
```

### 5. Test the System
```bash
# Run comprehensive tests
npm run test-system

# Test specific components
node scripts/test-system.js --verbose
```

---

## 📚 Detailed Setup Guides

### Option A: Google Cloud Speech-to-Text (Recommended)

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing one
   - Enable Speech-to-Text API

2. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Download JSON key file
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

### Option B: OpenAI Whisper

1. **Get OpenAI API Key**
   - Go to [OpenAI API](https://platform.openai.com/api-keys)
   - Create new API key
   - Set `OPENAI_API_KEY` in environment

### Video Setup Options

#### Option 1: Record Your Own Videos
1. Follow guidelines in `docs/recording-guidelines.md`
2. Use professional recording setup
3. Convert with `npm run convert-video`
4. Upload with `npm run upload-videos`

#### Option 2: Use Stock Videos (Demo Only)
1. Download sample ASL videos from free sources
2. Rename according to mapping.json
3. Place in `data/videos/` directory

#### Option 3: Generate Placeholder Content
```bash
# Creates placeholder files for testing
npm run setup-videos
```

---

## 🖥️ Deployment Options

### Local Development
```bash
npm run dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health Check: http://localhost:3001/health

### Docker Deployment
```bash
npm run docker:build
npm run docker:up
```

### Production Deployment
```bash
# Local production
./scripts/deploy.sh local

# Docker production
./scripts/deploy.sh docker

# Heroku
./scripts/deploy.sh heroku

# AWS (setup guide)
./scripts/deploy.sh aws
```

---

## 🧪 Testing & Verification

### System Health Check
Visit: http://localhost:3001/health

Expected response:
```json
{
  "status": "OK",
  "service": "speech-to-sign-backend",
  "uptime": 123,
  "issues": []
}
```

### Frontend Test
Visit: http://localhost:3000
1. ✅ Click microphone button
2. ✅ Grant microphone permission
3. ✅ Say "hello" or type "hello"
4. ✅ See sign language video play
5. ✅ Check captions appear

### API Test
```bash
# Test mapping
curl -X POST http://localhost:3001/api/map \
  -H "Content-Type: application/json" \
  -d '{"text": "hello"}'

# Expected: Returns video URLs and confidence score
```

---

## 📊 Monitoring & Metrics

### Health Endpoints
- **Health Check**: `/health` - Basic service status
- **Detailed Metrics**: `/metrics` - Full system metrics  
- **Status Summary**: `/status` - Service overview

### Metrics Dashboard
```bash
# View current metrics
curl http://localhost:3001/metrics
```

Key metrics tracked:
- 📈 Request success rate
- ⏱️ Average processing latency
- 🧠 Memory usage
- ❌ Error counts by type

---

## 🔧 Troubleshooting

### Common Issues

**"Cannot find module" errors**
```bash
rm -rf node_modules package-lock.json
npm run install:all
```

**Microphone not working**
- Check browser permissions (chrome://settings/content/microphone)
- Use HTTPS in production (required for microphone access)
- Test with different browsers

**Videos not loading**
- Check S3 bucket permissions (public read)
- Verify CloudFront distribution status
- Test video URLs directly

**High latency (>3 seconds)**
- Check API key quotas and limits
- Optimize video file sizes
- Use CDN for video delivery
- Consider local Whisper deployment

**Build errors**
```bash
# Clear caches
npm cache clean --force
rm -rf node_modules
npm install
```

### Debug Mode
```bash
NODE_ENV=development npm run dev
```

### Logs Location
- **Development**: Console output
- **Production**: `logs/` directory
- **Docker**: `docker-compose logs -f`

---

## 🚀 Next Steps

### For Development
1. **Add More Vocabulary**: Expand `data/vocabulary.csv`
2. **Improve Mapping**: Enhance text-to-gloss logic
3. **Add Languages**: Support multiple sign languages
4. **Performance**: Implement caching and optimization

### For Production
1. **SSL Certificate**: Enable HTTPS
2. **Domain Setup**: Configure custom domain
3. **Monitoring**: Set up alerts and logging
4. **Backup**: Implement data backup strategy
5. **Scaling**: Add load balancing and auto-scaling

### For Research
1. **User Studies**: Test with native signers
2. **AI Models**: Implement neural translation
3. **Avatar Generation**: Add 3D avatar rendering
4. **Continuous Learning**: User feedback integration

---

## 📞 Support & Community

### Documentation
- 📖 **API Docs**: `docs/api.md`
- 🎬 **Video Guide**: `docs/recording-guidelines.md`
- 🔧 **Deployment**: `docs/deployment.md`

### Getting Help
- 🐛 **Issues**: Create GitHub issue
- 💬 **Discussions**: GitHub discussions
- 📧 **Email**: your-email@example.com

### Contributing
- 🤝 **Guidelines**: `CONTRIBUTING.md`
- 📝 **Code Style**: ESLint + Prettier
- ✅ **Tests**: Required for PRs

---

## 🎉 You're Ready!

Your Speech-to-Sign Language system is now set up and ready to use. Start by testing the basic functionality, then gradually add more videos and features.

**Happy Signing! 🤟**