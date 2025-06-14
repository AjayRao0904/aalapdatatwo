import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const RESPONSES_KEY = 'responses/all_responses.json';
const INDEX_KEY = 'responses/index.json';

async function updateSubmittedIds(comboId: string) {
  const bucket = process.env.AWS_BUCKET_NAME || 'aalapdatatwo';
  let ids: string[] = [];
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: INDEX_KEY }));
    if (res.Body) {
      const text = await new Response(res.Body as any).text();
      ids = JSON.parse(text);
    }
  } catch {
    ids = [];
  }
  if (!ids.includes(comboId)) ids.push(comboId);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: INDEX_KEY,
      Body: JSON.stringify(ids),
      ContentType: 'application/json',
    }),
  );
}

async function appendResponseToAllResponses(bucket: string, response: any) {
  let responses: any[] = [];
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: RESPONSES_KEY }));
    if (res.Body) {
      const text = await new Response(res.Body as any).text();
      responses = JSON.parse(text);
    }
  } catch {
    responses = [];
  }
  responses.push(response);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: RESPONSES_KEY,
      Body: JSON.stringify(responses, null, 2),
      ContentType: 'application/json',
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sfx_id, music_id, timestamp } = body;

    if (!sfx_id || !music_id || timestamp === undefined) {
      const errorResponse = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return errorResponse;
    }

    const comboId = `${sfx_id}_${music_id}`;
    const bucket = process.env.AWS_BUCKET_NAME || 'aalapdatatwo';

    // Append the response to the single all_responses.json file
    await appendResponseToAllResponses(bucket, { sfx_id, music_id, timestamp });

    // Update the index
    await updateSubmittedIds(comboId);
    
    const successResponse = NextResponse.json({ message: 'Response submitted successfully' });
    successResponse.headers.set('Access-Control-Allow-Origin', '*');
    successResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    successResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return successResponse;
  } catch (err: any) {
    console.error('Failed to submit response:', err);
    const errorResponse = NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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