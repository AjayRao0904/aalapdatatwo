# Audio Synchronization Data Collection Tool

This is a [Next.js](https://nextjs.org) application for collecting audio synchronization data. Users can listen to sound effects and music tracks, then provide timestamp feedback on where they think the sound effect should be placed within the music track.

## Features

- **Audio Pair Management**: Automatically fetches available audio pairs from S3
- **Matching IDs**: Displays sound effects and music tracks with matching IDs (e.g., `001` for both `sfx_001` and `music_001`)
- **Interactive Timeline**: Slider-based audio seeking with real-time timestamp display
- **Submission Tracking**: Prevents duplicate submissions and removes rated samples from the UI
- **Navigation**: Browse through available audio pairs with previous/next controls

## Getting Started

### Prerequisites

- Node.js 18+ 
- AWS S3 bucket with the following structure:
  ```
  your-bucket/
  ├── sfx_outputs/
  │   ├── sfx_001.mp3
  │   ├── sfx_002.mp3
  │   └── ...
  ├── music_outputs/
  │   ├── music_001.wav
  │   ├── music_002.wav
  │   └── ...
  └── responses/
      └── index.json (will be created automatically)
  ```

### Environment Setup

Create a `.env.local` file in the project root with your AWS credentials:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-2
AWS_BUCKET_NAME=your_bucket_name
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

1. **Audio Pair Discovery**: The app fetches all available audio pairs from S3
2. **Submission Filtering**: Already rated pairs are filtered out automatically
3. **Audio Playback**: Users can play sound effects and music tracks separately
4. **Timestamp Selection**: Users can seek through the music track to find the optimal placement
5. **Response Submission**: Timestamp data is saved to S3 and the pair is removed from the queue

## API Endpoints

- `GET /api/available-pairs` - Lists all available audio pairs
- `GET /api/audio?sfx_id=sfx_001&music_id=music_001` - Fetches audio files for a specific pair
- `POST /api/submit-response` - Submits user response with timestamp

## Data Structure

### Audio Files
- Sound effects: `sfx_outputs/sfx_{id}.mp3`
- Music tracks: `music_outputs/music_{id}.wav`

### Response Data
```json
{
  "sfx_id": "sfx_001",
  "music_id": "music_001", 
  "timestamp": 12.34
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
