import crypto from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { Prisma } from '../generated/prisma';
import { env } from '../config/env';
import { prisma } from '../core/prisma';
import { ApiError } from '../utils/ApiError';

const storageRoot = path.resolve(env.FILE_STORAGE_PATH);

export const privateUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 2,
    fieldSize: 2000,
  },
}).single('file');

export function detectPrivateFile(buffer: Buffer) {
  if (buffer.subarray(0, 5).toString() === '%PDF-')
    return { mime: 'application/pdf', extension: 'pdf' };
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mime: 'image/png', extension: 'png' };
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    return { mime: 'image/jpeg', extension: 'jpg' };
  throw new ApiError(422, 'Berkas harus berupa PDF, PNG, atau JPEG yang valid');
}

export function sanitizeOriginalFilename(name: string, fallbackExtension: string) {
  return (
    path
      .basename(name)
      .replace(/[\u0000-\u001f\u007f<>:&"\\]/g, '_')
      .slice(0, 255) || `berkas.${fallbackExtension}`
  );
}

function getSupabaseHeaders(extra: Record<string, string> = {}) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const headers: Record<string, string> = {
    apikey: key,
    ...extra,
  };
  if (!key.startsWith('sb_')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

async function ensureSupabaseBucket() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  await fetch(`${env.SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: getSupabaseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: false,
      file_size_limit: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    }),
  }).catch(() => undefined);
}

async function uploadToSupabase(key: string, buffer: Buffer, mimeType: string) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(503, 'Konfigurasi Supabase Storage belum lengkap');
  }
  const bucket = encodeURIComponent(env.SUPABASE_STORAGE_BUCKET);
  const objectUrl = `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(key)}`;

  let res = await fetch(objectUrl, {
    method: 'POST',
    headers: getSupabaseHeaders({
      'Content-Type': mimeType,
      'x-upsert': 'false',
    }),
    body: new Uint8Array(buffer),
  });

  if (res.status === 400 || res.status === 404) {
    await ensureSupabaseBucket();
    res = await fetch(objectUrl, {
      method: 'POST',
      headers: getSupabaseHeaders({
        'Content-Type': mimeType,
        'x-upsert': 'false',
      }),
      body: new Uint8Array(buffer),
    });
  }

  if (!res.ok) {
    throw new ApiError(502, 'Gagal mengunggah berkas ke Supabase Storage');
  }
}

async function deleteFromSupabase(key: string) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const bucket = encodeURIComponent(env.SUPABASE_STORAGE_BUCKET);
  await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: getSupabaseHeaders(),
  }).catch(() => undefined);
}

async function downloadFromSupabase(key: string): Promise<Buffer> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(503, 'Konfigurasi Supabase Storage belum lengkap');
  }
  const bucket = encodeURIComponent(env.SUPABASE_STORAGE_BUCKET);
  const res = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(key)}`,
    {
      method: 'GET',
      headers: getSupabaseHeaders(),
    },
  );
  if (!res.ok) {
    throw new ApiError(404, 'Berkas tidak ditemukan');
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function withPrivateFile<T>(
  file: Express.Multer.File | undefined,
  tenantId: bigint,
  userId: bigint,
  link: (tx: Prisma.TransactionClient, fileId: bigint) => Promise<T>,
) {
  if (!file) throw new ApiError(422, 'Berkas wajib dipilih');
  if (env.FILE_STORAGE_DRIVER !== 'local' && env.FILE_STORAGE_DRIVER !== 'supabase') {
    throw new ApiError(503, 'Penyimpanan berkas belum dikonfigurasi');
  }

  const driver = env.FILE_STORAGE_DRIVER;
  const detected = detectPrivateFile(file.buffer);
  const filename = sanitizeOriginalFilename(file.originalname, detected.extension);
  const key = crypto.randomUUID();

  if (driver === 'supabase') {
    await uploadToSupabase(key, file.buffer, detected.mime);
  } else {
    await mkdir(storageRoot, { recursive: true, mode: 0o700 });
    await writeFile(path.join(storageRoot, key), file.buffer, { flag: 'wx', mode: 0o600 });
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const record = await tx.files.create({
          data: {
            tenant_id: tenantId,
            uploaded_by_user_id: userId,
            storage_driver: driver,
            storage_key: key,
            original_name: filename,
            mime_type: detected.mime,
            extension: detected.extension,
            size_bytes: BigInt(file.buffer.length),
            checksum_sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
            visibility: 'PRIVATE',
            scan_status: 'PENDING',
          },
        });
        return link(tx, record.id);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (driver === 'supabase') {
      await deleteFromSupabase(key);
    } else {
      await unlink(path.join(storageRoot, key)).catch(() => undefined);
    }
    throw error;
  }
}

export async function readPrivateFile(key: string, driver: string = 'local') {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new ApiError(404, 'Berkas tidak ditemukan');
  if (driver === 'supabase') {
    return downloadFromSupabase(key);
  }
  try {
    return await readFile(path.join(storageRoot, key));
  } catch {
    throw new ApiError(404, 'Berkas tidak ditemukan');
  }
}
