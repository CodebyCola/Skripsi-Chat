// Ref: FR-CHAIN-02/05 — batas dokumen sama dengan server (MAX_FILE_MB)
export const MAX_DOC_MB = 25;

export const ASSET_TYPE_LABEL: Record<string, string> = {
  THESIS_ACC: 'ACC Sidang',
  GRADE: 'Nilai',
  CERTIFICATE: 'Sertifikat',
  DIPLOMA: 'Ijazah',
  DRAFT_SUBMISSION: 'Pengajuan Draf',
};

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca berkas dari perangkat'));
    reader.readAsDataURL(file);
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Null bila berkas layak diunggah; selain itu pesan kesalahan untuk pengguna */
export function validateDocument(file: File): string | null {
  if (file.size === 0) return 'Berkas kosong';
  if (file.size > MAX_DOC_MB * 1024 * 1024) return `Ukuran berkas melebihi ${MAX_DOC_MB} MB`;
  return null;
}