import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Helper to get all submitted IDs from S3 index file
async function getSubmittedIds(): Promise<Set<string>> {
  try {
    const res = await s3.send(new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || "aalapdatatwo",
      Key: "responses/index.json"
    }));
    if (!res.Body) return new Set();
    const text = await new Response(res.Body as any).text();
    const arr = JSON.parse(text);
    return new Set(arr);
  } catch {
    // If file doesn't exist, treat as empty
    return new Set();
  }
}

// Helper to extract ID from S3 key (e.g., "sfx_outputs/sfx_001.mp3" -> "001" or "music_outputs/music_001.wav" -> "001")
function extractIdFromKey(key: string): string | null {
  const match = key.match(/\/(sfx_|music_)(\d+)\.(mp3|wav)$/);
  return match ? match[2] : null;
}

export async function GET() {
  try {
    const bucket = process.env.AWS_BUCKET_NAME || "aalapdatatwo";
    
    // Get all SFX files
    const sfxRes = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "sfx_outputs/"
    }));

    // Get all music files
    const musicRes = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "music_outputs/"
    }));

    // Extract IDs from SFX files
    const sfxIds = new Set<string>();
    if (sfxRes.Contents) {
      sfxRes.Contents.forEach(obj => {
        if (obj.Key) {
          const id = extractIdFromKey(obj.Key);
          if (id) sfxIds.add(id);
        }
      });
    }

    // Extract IDs from music files
    const musicIds = new Set<string>();
    if (musicRes.Contents) {
      musicRes.Contents.forEach(obj => {
        if (obj.Key) {
          const id = extractIdFromKey(obj.Key);
          if (id) musicIds.add(id);
        }
      });
    }

    // Find common IDs (pairs that exist for both SFX and music)
    const commonIds = Array.from(sfxIds).filter(id => musicIds.has(id));

    // Get already submitted pairs
    const submittedIds = await getSubmittedIds();

    // Filter out already submitted pairs
    const availablePairs = commonIds
      .filter(id => !submittedIds.has(`sfx_${id}_music_${id}`))
      .map(id => ({
        id,
        sfx_id: `sfx_${id}`,
        music_id: `music_${id}`
      }));

    return NextResponse.json({
      pairs: availablePairs,
      total: availablePairs.length
    });

  } catch (err: any) {
    console.error("Error fetching available pairs:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to fetch available pairs" 
    }, { status: 500 });
  }
} 