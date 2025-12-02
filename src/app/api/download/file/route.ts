import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

    const filePath = path.join(process.cwd(), 'db', filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain',
  };

  const headers = new Headers();
    headers.set('Content-Type', contentTypes[ext] || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', fileBuffer.length.toString());

    return new NextResponse(fileBuffer, { status: 200, headers });
}