/**
 * Helper to get accessible URLs for external devices (like student smartphones).
 * Handles both public shared domain (ais-pre-*) and dev domain (ais-dev-*)
 */
export function getActiveOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-pre-3ynzpxlq3dlqmypenufya3-262314127389.asia-northeast1.run.app';
  }
  return window.location.origin;
}

export function getPublicOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-pre-3ynzpxlq3dlqmypenufya3-262314127389.asia-northeast1.run.app';
  }
  const origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

export function getDevOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-dev-3ynzpxlq3dlqmypenufya3-262314127389.asia-northeast1.run.app';
  }
  const origin = window.location.origin;
  if (origin.includes('ais-pre-')) {
    return origin.replace('ais-pre-', 'ais-dev-');
  }
  return origin;
}

export function getPublicStudentUrl(room?: string, useDevDomain = false): string {
  const base = useDevDomain ? getDevOrigin() : getPublicOrigin();
  if (room) {
    return `${base}/#/student?room=${encodeURIComponent(room)}`;
  }
  return `${base}/#/student`;
}

export function getStudentClassQrUrl(grade: number, classNum: number, useDevDomain = false): string {
  const base = useDevDomain ? getDevOrigin() : getPublicOrigin();
  return `${base}/#/student?grade=${grade}&classNum=${classNum}`;
}

export function getStudentDirectLoginUrl(grade: number, classNum: number, num: number, name: string, useDevDomain = false): string {
  const base = useDevDomain ? getDevOrigin() : getPublicOrigin();
  return `${base}/#/student?grade=${grade}&class=${classNum}&num=${num}&name=${encodeURIComponent(name)}`;
}


