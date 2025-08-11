#!/usr/bin/env node

/**
 * Video Setup Helper Script
 * Helps create placeholder videos and upload to S3
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SCRIPT_DIR = path.dirname(__filename);
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');
const VIDEO_DIR = path.join(PROJECT_ROOT, 'data', 'videos');
const MAPPING_FILE = path.join(PROJECT_ROOT, 'data', 'mapping.json');
const VOCABULARY_FILE = path.join(PROJECT_ROOT, 'data', 'vocabulary.csv');

// Create videos directory if it doesn't exist
if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
    console.log(`✅ Created video directory: ${VIDEO_DIR}`);
}

// Sample ASL video URLs from public sources (for demo purposes)
const DEMO_VIDEO_URLS = {
    'HELLO.mp4': 'https://media.spreadthesign.com/video/mp4/13/48955.mp4',
    'THANK-YOU.mp4': 'https://media.spreadthesign.com/video/mp4/13/49006.mp4',
    'YES.mp4': 'https://media.spreadthesign.com/video/mp4/13/48789.mp4',
    'NO.mp4': 'https://media.spreadthesign.com/video/mp4/13/48788.mp4',
    'PLEASE.mp4': 'https://media.spreadthesign.com/video/mp4/13/48787.mp4',
    'SORRY.mp4': 'https://media.spreadthesign.com/video/mp4/13/48958.mp4',
    'HELP.mp4': 'https://media.spreadthesign.com/video/mp4/13/48952.mp4',
    'STOP.mp4': 'https://media.spreadthesign.com/video/mp4/13/49001.mp4',
    'WATER.mp4': 'https://media.spreadthesign.com/video/mp4/13/48999.mp4',
    'BATHROOM.mp4': 'https://media.spreadthesign.com/video/mp4/13/48940.mp4',
};

// Download a file from URL
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

// Create recording guidelines document
function createRecordingGuidelines() {
    const guidelines = `# Sign Language Video Recording Guidelines

## Equipment Setup
- **Camera**: 1080p minimum, 60fps preferred
- **Lighting**: Soft, even front lighting
- **Background**: Solid color (blue or green screen optional)
- **Audio**: Record synchronized audio for timing reference

## Framing Requirements
- Upper body visible (waist up)
- Hands fully visible at all times
- Face clearly visible for facial expressions
- Consistent distance from camera

## Recording Standards
- **Duration**: 1-4 seconds per sign
- **Format**: MP4, H.264 codec
- **Resolution**: 1920x1080 or 1280x720
- **Frame Rate**: 30fps minimum, 60fps preferred

## Signer Requirements
- Native or fluent ASL signer
- Clear, natural signing speed
- Consistent signing style
- Proper facial expressions and non-manual markers

## File Naming Convention
- Use gloss names: HELLO.mp4, THANK-YOU.mp4
- No spaces, use hyphens for multi-word signs
- All caps for consistency

## Quality Checklist
□ Sign is clearly visible
□ Proper hand shape and movement
□ Appropriate facial expression
□ Good lighting and contrast
□ Stable camera (no shaking)
□ Clean background
□ Proper timing (not too fast/slow)

## Post-Processing
1. Trim to exact sign duration
2. Standardize resolution and frame rate
3. Optimize file size for web delivery
4. Add to mapping system

## Legal Considerations
- Obtain proper consent from signers
- Respect cultural sensitivity
- Credit signers appropriately
- Consider usage rights for distribution

For questions or technical support, refer to the project documentation.
`;

    const guidelinesPath = path.join(PROJECT_ROOT, 'docs', 'recording-guidelines.md');
    if (!fs.existsSync(path.dirname(guidelinesPath))) {
        fs.mkdirSync(path.dirname(guidelinesPath), { recursive: true });
    }
    
    fs.writeFileSync(guidelinesPath, guidelines);
    console.log(`✅ Created recording guidelines: ${guidelinesPath}`);
}

// Create video conversion script
function createVideoConverter() {
    const script = `#!/bin/bash

# Video Conversion Script for Sign Language Videos
# Converts various video formats to web-optimized MP4

if [ $# -eq 0 ]; then
    echo "Usage: $0 <input-video> [output-name]"
    echo "Example: $0 raw_hello.mov HELLO.mp4"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_NAME="${2:-$(basename "$INPUT_FILE" | sed 's/\\.[^.]*$/.mp4/')}"
OUTPUT_DIR="../data/videos"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed. Please install it first:"
    echo "macOS: brew install ffmpeg"
    echo "Ubuntu: sudo apt install ffmpeg"
    echo "Windows: Download from https://ffmpeg.org/"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🎬 Converting video: $INPUT_FILE -> $OUTPUT_DIR/$OUTPUT_NAME"

# Convert video with optimized settings for web
ffmpeg -i "$INPUT_FILE" \\
    -c:v libx264 \\
    -preset medium \\
    -crf 23 \\
    -c:a aac \\
    -b:a 128k \\
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \\
    -r 30 \\
    -movflags +faststart \\
    -y "$OUTPUT_DIR/$OUTPUT_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Video converted successfully: $OUTPUT_DIR/$OUTPUT_NAME"
    
    # Get video info
    echo
    echo "📊 Video Information:"
    ffprobe -v quiet -print_format json -show_format -show_streams "$OUTPUT_DIR/$OUTPUT_NAME" | \\
        jq -r '.format.duration as $duration | .streams[] | select(.codec_type=="video") | 
        "Duration: \\($duration)s\\nResolution: \\(.width)x\\(.height)\\nFrame Rate: \\(.r_frame_rate)\\nCodec: \\(.codec_name)"'
    
    echo
    echo "🔗 Next steps:"
    echo "1. Review the converted video for quality"
    echo "2. Update the mapping.json if needed"
    echo "3. Upload to S3 with: npm run upload-videos"
else
    echo "❌ Video conversion failed"
    exit 1
fi
`;

    const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'convert-video.sh');
    if (!fs.existsSync(path.dirname(scriptPath))) {
        fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    }
    
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');
    console.log(`✅ Created video converter: ${scriptPath}`);
}

// Create sample videos for testing (placeholder)
async function createSampleVideos() {
    console.log('📹 Setting up sample videos for testing...');
    
    // Create placeholder text files as video references for now
    const placeholderVideos = [
        'HELLO.mp4', 'THANK-YOU.mp4', 'YES.mp4', 'NO.mp4', 'PLEASE.mp4',
        'SORRY.mp4', 'HELP.mp4', 'STOP.mp4', 'WHERE.mp4', 'WHAT.mp4'
    ];
    
    for (const videoName of placeholderVideos) {
        const filePath = path.join(VIDEO_DIR, videoName);
        const placeholder = `# Placeholder for ${videoName}
This is a placeholder file. Replace with actual ASL video.

Video Requirements:
- Duration: 1-3 seconds
- Format: MP4 (H.264)
- Resolution: 1280x720 or 1920x1080
- Frame Rate: 30fps minimum
- Audio: Optional synchronized audio

Recording Notes:
- Sign: ${videoName.replace('.mp4', '').replace('-', ' ')}
- Signer should be clearly visible (upper body)
- Good lighting and contrast
- Neutral background
- Natural signing speed
`;
        
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, placeholder);
            console.log(`  ✅ Created placeholder: ${videoName}`);
        }
    }
    
    console.log(`\n📁 Sample videos created in: ${VIDEO_DIR}`);
    console.log('⚠️  Replace placeholder files with actual ASL videos');
}

// Main execution
async function main() {
    console.log('🎬 Speech-to-Sign Video Setup\n');
    
    try {
        createRecordingGuidelines();
        createVideoConverter();
        await createSampleVideos();
        
        console.log('\n🎉 Video setup complete!');
        console.log('\nNext steps:');
        console.log('1. Review recording guidelines in docs/recording-guidelines.md');
        console.log('2. Replace placeholder videos in data/videos/');
        console.log('3. Use scripts/convert-video.sh to process raw videos');
        console.log('4. Configure S3 storage with npm run setup-s3');
        console.log('5. Upload videos with npm run upload-videos');
        
    } catch (error) {
        console.error('❌ Error during video setup:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createSampleVideos, createRecordingGuidelines, createVideoConverter };