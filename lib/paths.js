import path from 'node:path';

// On Railway, set DATA_DIR=/data and mount a Volume at /data so the database and
// uploaded photos persist across deploys. Locally it falls back to ./data.
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const DB_PATH = path.join(DATA_DIR, 'chores.db');
