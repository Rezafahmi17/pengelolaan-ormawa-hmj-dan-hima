import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_VERCEL_FRONTEND_ORIGIN = 'https://sim-ormawa-polinela.vercel.app';

export function extractOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const primary = extractOrigin(env.FRONTEND_URL);
  if (primary) {
    origins.add(primary);
  }

  if (env.ALLOWED_ORIGINS) {
    for (const entry of env.ALLOWED_ORIGINS.split(',')) {
      const parsed = extractOrigin(entry);
      if (parsed) {
        origins.add(parsed);
      }
    }
  }

  if (process.env.VERCEL) {
    origins.add(DEFAULT_VERCEL_FRONTEND_ORIGIN);
    if (process.env.VERCEL_URL) {
      const vercelOrigin = extractOrigin(`https://${process.env.VERCEL_URL}`);
      if (vercelOrigin) origins.add(vercelOrigin);
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      const prodOrigin = extractOrigin(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
      if (prodOrigin) origins.add(prodOrigin);
    }
  }

  return origins;
}

export function isAllowedRequestOrigin(originHeader?: string, refererHeader?: string): boolean {
  const allowed = getAllowedOrigins();
  if (originHeader) {
    const parsedOrigin = extractOrigin(originHeader);
    return Boolean(parsedOrigin && allowed.has(parsedOrigin));
  }
  if (refererHeader) {
    const parsedRefererOrigin = extractOrigin(refererHeader);
    return Boolean(parsedRefererOrigin && allowed.has(parsedRefererOrigin));
  }
  return false;
}

export function verifyMutationOrigin(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  if (!isAllowedRequestOrigin(origin, referer)) {
    return next(new ApiError(403, 'Origin permintaan tidak diizinkan', undefined, 'INVALID_ORIGIN'));
  }

  const contentType = req.get('content-type') ?? '';
  if (!contentType.startsWith('application/json') && !contentType.startsWith('multipart/form-data')) {
    return next(new ApiError(415, 'Tipe konten tidak didukung', undefined, 'UNSUPPORTED_MEDIA_TYPE'));
  }
  return next();
}
