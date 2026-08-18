/**
 * Helper to get accessible URLs for external devices (like student smartphones).
 * Always uses the active window.location.origin so scanned QR codes connect to the EXACT current running instance.
 */
export function getActiveOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-dev-3ynzpxlq3dlqmypenufya3-262314127389.asia-northeast1.run.app';
  }
  return window.location.origin;
}

export function getPublicOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-dev-3ynzpxlq3dlqmypenufya3-262314127389.asia-northeast1.run.app';
  }
  return window.location.origin;
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


