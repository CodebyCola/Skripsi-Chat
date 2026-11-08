// Ref: FR-FILE-01..05
export type FileStatus = 'SUBMITTED' | 'REVISION' | 'APPROVED';
export type ReviewStatus = Exclude<FileStatus, 'SUBMITTED'>;

export interface FileRecord {
  id: number;
  convId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  originalSha256: string;
  uploader: string;
  version: number;
  status: FileStatus;
  reviewedBy: string;
  reviewNote: string;
  reviewedAt: string;
  createdAt: string;
}

export interface UploadFilePayload {
  convId: number;
  originalName: string;
  /** Data URL / base64 dari FileReader; server membuang prefix `data:...;base64,` */
  fileBase64: string;
}

export interface DownloadedFile {
  originalName: string;
  mimeType: string;
  version: number;
  sha256Verified: boolean;
  decryptedSha256: string;
  decryptedBase64: string;
}

/** Hasil cek hash terakhir saat mengunduh (FR-FILE-04) */
export type HashCheck = { ok: true; sha256: string } | { ok: false; message: string };

/** Percakapan yang dipakai sebagai pemilih ruang berkas */
export interface FileConversation {
  id: number;
  topic: string;
  peerName: string;
}