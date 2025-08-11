# Google Cloud Speech-to-Text Setup Guide

This guide provides **two methods** to set up Google Cloud Speech-to-Text API for the Speech-to-Sign application.

## 🚀 Quick Setup (Recommended)

### Method 1: Automated Setup (CLI Required)
If you have Google Cloud SDK installed:

```bash
# Navigate to project root
cd /Users/kwamebaffoe/Desktop/speech-to-sign

# Run automated setup
npm run setup-google-cloud
```

**Prerequisites:**
- Google Cloud SDK installed: `https://cloud.google.com/sdk/docs/install`
- Authenticated with Google Cloud: `gcloud auth login`

### Method 2: Web-Based Setup (No CLI Required)
Interactive script that guides you through the web console:

```bash
# Navigate to project root
cd /Users/kwamebaffoe/Desktop/speech-to-sign

# Run interactive web setup
npm run setup-google-web
```

This will:
1. Open Google Cloud Console in your browser
2. Guide you through creating service account
3. Help you download the JSON key
4. Automatically configure your environment

## 📋 What Gets Set Up

Both methods will:

✅ **Enable required APIs:**
- Cloud Speech-to-Text API
- IAM API
- Cloud Resource Manager API

✅ **Create service account:**
- Name: `speech-to-sign-sa`
- Roles: `Cloud Speech Client`, `Cloud Speech Viewer`

✅ **Generate JSON key file:**
- Location: `backend/.gcp/speech-to-sign-key.json`
- Auto-configured in environment variables

✅ **Update environment:**
- Sets `GOOGLE_APPLICATION_CREDENTIALS` in `.env`
- Sets `GOOGLE_CLOUD_PROJECT` in `.env`

## 🔧 Manual Setup (Advanced)

If you prefer manual setup:

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing one
3. Note your **Project ID**

### 2. Enable Speech-to-Text API
```bash
# Via CLI
gcloud services enable speech.googleapis.com --project=YOUR_PROJECT_ID

# Or visit: https://console.cloud.google.com/apis/library/speech.googleapis.com
```

### 3. Create Service Account
```bash
# Via CLI
gcloud iam service-accounts create speech-to-sign-sa \
  --description="Service account for Speech-to-Sign app" \
  --display-name="Speech to Sign SA" \
  --project=YOUR_PROJECT_ID
```

### 4. Assign Roles
```bash
# Via CLI
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:speech-to-sign-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/speech.client"
```

### 5. Create JSON Key
```bash
# Via CLI
gcloud iam service-accounts keys create ./backend/.gcp/speech-to-sign-key.json \
  --iam-account=speech-to-sign-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --project=YOUR_PROJECT_ID
```

### 6. Update Environment
Add to `backend/.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS=./.gcp/speech-to-sign-key.json
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

## 🧪 Testing Your Setup

After setup, test the configuration:

```bash
# Test authentication
cd backend
node test-speech-auth.js

# Start the application
npm run dev
```

Expected output:
```
✅ Authentication successful!
Google Cloud Speech-to-Text is ready to use.
```

## 🔒 Security Best Practices

### File Security
- JSON key file is in `.gcp/` directory
- Directory is added to `.gitignore`
- Never commit credentials to version control

### IAM Security
- Service account has minimal required permissions
- Only `speech.client` role assigned (not broad admin roles)
- Keys can be rotated via Google Cloud Console

### Environment Security
- Credentials stored as environment variables
- Relative paths used for portability
- Separate development/production configurations

## 🐛 Troubleshooting

### Common Issues

**"Authentication failed" error:**
```bash
# Check if file exists
ls -la backend/.gcp/speech-to-sign-key.json

# Verify JSON format
cat backend/.gcp/speech-to-sign-key.json | jq .

# Check environment variable
cd backend && node -e "console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS)"
```

**"Permission denied" error:**
- Ensure service account has `speech.client` role
- Wait 5-10 minutes for IAM changes to propagate
- Verify project billing is enabled

**"API not enabled" error:**
```bash
# Enable the API
gcloud services enable speech.googleapis.com --project=YOUR_PROJECT_ID
```

**"File not found" error:**
- Check file path is relative to backend directory
- Ensure file is named exactly `speech-to-sign-key.json`
- Verify file has proper JSON format

### Validation Commands

```bash
# Check if service account exists
gcloud iam service-accounts describe speech-to-sign-sa@PROJECT_ID.iam.gserviceaccount.com

# List service account keys
gcloud iam service-accounts keys list --iam-account=speech-to-sign-sa@PROJECT_ID.iam.gserviceaccount.com

# Test API access
gcloud auth application-default print-access-token
```

## 🔄 Key Rotation

To rotate service account keys:

```bash
# Delete old key (get KEY_ID from list command above)
gcloud iam service-accounts keys delete KEY_ID --iam-account=speech-to-sign-sa@PROJECT_ID.iam.gserviceaccount.com

# Create new key
gcloud iam service-accounts keys create ./backend/.gcp/speech-to-sign-key.json \
  --iam-account=speech-to-sign-sa@PROJECT_ID.iam.gserviceaccount.com

# Restart your application
```

## 💰 Cost Management

Google Cloud Speech-to-Text pricing:
- **Free tier:** 60 minutes/month
- **Standard:** $0.006/15-second increment
- **Enhanced models:** $0.009/15-second increment

Monitor usage:
- [Google Cloud Console Billing](https://console.cloud.google.com/billing)
- Set up billing alerts
- Use quotas to prevent unexpected charges

## 📞 Support

If you encounter issues:

1. **Check logs:** `cd backend && npm start` (look for authentication messages)
2. **Verify setup:** Run the test script `node test-speech-auth.js`
3. **Google Cloud Status:** Check [Google Cloud Status](https://status.cloud.google.com/)
4. **Documentation:** [Speech-to-Text API docs](https://cloud.google.com/speech-to-text/docs)

---

**Next Steps:** After successful setup, you can start the full application with `npm run dev` from the project root!