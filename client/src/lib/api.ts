/**
 * Helper pemanggil API Backend AegisVault.
 * 1. Mencoba jalur Next.js Rewrite Proxy (`/api/...`) terlebih dahulu agar bebas CORS.
 * 2. Jika Next.js belum di-restart sehingga `/api/...` mengembalikan HTML 404,
 *    otomatis fallback langsung ke `http://localhost:4000/api/...`.
 */
export const SERVER_CONSOLE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const TOKEN_KEY = 'skripsichat_token';

/** Dikirim ke window saat sesi habis/idle-lock di halaman dashboard (ditampilkan sebagai banner). */
export const SESSION_EXPIRED_EVENT = 'skripsichat:session-expired';

/** Error dari server yang membawa status HTTP & kode resmi (Spesifikasi Bagian 13). */
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Pesan ramah untuk kode yang sering muncul di UI (hanya dipakai bila server tidak mengirim pesan)
const FRIENDLY: Record<string, string> = {
  ERR_FORBIDDEN: 'Anda tidak memiliki izin untuk aksi ini.',
  ERR_NOT_PARTICIPANT: 'Anda bukan peserta percakapan ini.',
};

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(endpoint, init);
    const contentType = res.headers.get('content-type') || '';
    // Jika Next.js dev server belum me-reload next.config.ts rewrites, fallback ke port 4000 langsung
    if (res.status === 404 && contentType.includes('text/html')) {
      res = await fetch(`${SERVER_CONSOLE_URL}${endpoint}`, init);
    }
  } catch {
    // Fallback langsung ke port 4000
    res = await fetch(`${SERVER_CONSOLE_URL}${endpoint}`, init);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      'Gagal membaca respons JSON dari Server (:4000). Pastikan server sudah di-restart (`npm start` di folder server)!'
    );
  }

  if (!res.ok) {
    // Sesi habis / idle-lock / logout di server → bersihkan data lokal & kembali ke login
    if (data?.code === 'ERR_SESSION_EXPIRED' && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('skripsichat_user');
      localStorage.removeItem('aegis_user');
      if (window.location.pathname.startsWith('/dashboard')) {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: data?.error }));
      } else if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    const fallback =
      FRIENDLY[data?.code] ||
      (res.status === 403
        ? FRIENDLY.ERR_FORBIDDEN
        : 'Terjadi kesalahan pada server kriptografi');
    throw new ApiError(data?.error || fallback, res.status, data?.code);
  }
  return data as T;
}