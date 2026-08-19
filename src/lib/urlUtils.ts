/**
 * Helper to get accessible URLs for external devices (like student smartphones).
 * Ensures smartphone QR codes point to the public shareable domain (ais-pre) so students can access without login errors.
 */
const SHARED_PUBLIC_BASE = 'https://ais-pre-3ynzpxlq3dlqmypenufya3-262314127389.asia-northeast1.run.app';

export function getActiveOrigin(): string {
  if (typeof window === 'undefined') {
    return SHARED_PUBLIC_BASE;
  }
  const current = window.location.origin;
  // If running inside private dev session (ais-dev), convert to public shareable (ais-pre) for smartphone compatibility
  if (current.includes('ais-dev-')) {
    return current.replace('ais-dev-', 'ais-pre-');
  }
  return current;
}

export function getPublicOrigin(): string {
  return SHARED_PUBLIC_BASE;
}

export function getDevOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-dev-3ynzpxlq3dlqmypenufya3-262314127389.asia-northeast1.run.app';
  }
  return window.location.origin;
}

export function getPublicStudentUrl(room?: string): string {
  const base = getActiveOrigin();
  if (room) {
    return `${base}/#/student?room=${encodeURIComponent(room)}`;
  }
  return `${base}/#/student`;
}

export function getStudentClassQrUrl(grade: number, classNum: number): string {
  const base = getActiveOrigin();
  return `${base}/#/student?grade=${grade}&classNum=${classNum}`;
}

export function getStudentDirectLoginUrl(grade: number, classNum: number, num: number, name: string): string {
  const base = getActiveOrigin();
  return `${base}/#/student?grade=${grade}&class=${classNum}&num=${num}&name=${encodeURIComponent(name)}`;
}


