import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/paths';

const TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

// Serves uploaded profile photos from the persistent data volume (DATA_DIR/uploads),
// since runtime-written files can't be served from the build's static public/ folder.
export async function GET(_request, { params }) {
  try {
    const name = path.basename(params?.name || ''); // strip any path traversal
    if (!name) return new Response('Not found', { status: 404 });
    const file = path.join(UPLOAD_DIR, name);
    if (!file.startsWith(UPLOAD_DIR) || !fs.existsSync(file)) {
      return new Response('Not found', { status: 404 });
    }
    const data = fs.readFileSync(file);
    const ext = (name.split('.').pop() || '').toLowerCase();
    return new Response(data, {
      headers: {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

export const dynamic = 'force-dynamic';
