// app/api/audio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Helper function to convert S3 Body to Buffer
async function streamToBuffer(body: any): Promise<Buffer> {
  if (body instanceof Buffer) {
    return body;
  }
  
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  
  if (typeof body === 'string') {
    return Buffer.from(body);
  }
  
  // If it's a stream-like object, try to read it
  if (body && typeof body === 'object') {
    try {
      // Try to get the stream as an async iterable
      const chunks: Uint8Array[] = [];
      for await (const chunk of body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      // If that fails, try to read it as a readable stream
      try {
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        return Buffer.concat(chunks);
      } catch (streamError) {
        throw new Error('Unable to read S3 response body');
      }
    }
  }
  
  throw new Error('Unsupported S3 response body type');
}

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
  } catch (e) {
    // If file doesn't exist, treat as empty
    return new Set();
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sfx_id = searchParams.get("sfx_id");
  const music_id = searchParams.get("music_id");

  if (!sfx_id || !music_id) {
    return NextResponse.json({ error: "Missing sfx_id or music_id" }, { status: 400 });
  }

  // Check if already submitted
  const submittedIds = await getSubmittedIds();
  const comboId = `${sfx_id}_${music_id}`;
  if (submittedIds.has(comboId)) {
    return NextResponse.json({ error: "Already submitted" }, { status: 403 });
  }

  try {
    // Get sound effect - use .mp3 extension
    const sfxRes = await s3.send(new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || "aalapdatatwo",
      Key: `sfx_outputs/${sfx_id}.mp3`
    }));

    // Get music track - use .wav extension
    const musicRes = await s3.send(new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || "aalapdatatwo",
      Key: `music_outputs/${music_id}.wav`
    }));

    if (!sfxRes.Body || !musicRes.Body) {
      throw new Error("Missing response body from S3");
    }

    const sfxBuffer = await streamToBuffer(sfxRes.Body);
    const musicBuffer = await streamToBuffer(musicRes.Body);

    return NextResponse.json({
      sfx: sfxBuffer.toString("base64"),
      music: musicBuffer.toString("base64")
    });
  } catch (err: any) {
    console.error("S3 Fetch Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch audio" }, { status: 500 });
  }
}
