import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'sfx' or 'music'
  const id = searchParams.get('id');

  if (!type || !id) {
    const errorResponse = NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }

  const folder = type === 'sfx' ? 'sfx_outputs' : 'music_outputs';
  const extension = type === 'sfx' ? 'mp3' : 'wav'; // Corrected file extension
  const key = `${folder}/${id}.${extension}`;

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    const jsonResponse = NextResponse.json({ url });
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*');
    jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return jsonResponse;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    const errorResponse = NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
