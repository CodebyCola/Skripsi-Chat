// Ref: FR-IMG-01 s.d. 04, FR-AUTH-08
export interface StegoImageRecord {
  id: number;
  convId: number;
  title: string;
  storedPngName: string;
  imageDataUrl?: string;
  width: number;
  height: number;
  maxCapacityBytes: number;
  embeddedBitsCount: number;
  psnrDb: number;
  mse: number;
  uploader: string;
  createdAt: string;
}

export interface EmbedStegoPayload {
  convId: number;
  title: string;
  note: string;
  coverPngBase64?: string;
}

export interface ExtractedStegoData {
  success: boolean;
  id?: number;
  convId: number;
  title: string;
  note: string;
  senderId: number;
  senderUsername: string;
  sentAt: string;
  coverSha256: string;
  width: number;
  height: number;
  psnrDb?: number;
  mse?: number;
  verified: boolean;
}

export interface StegoConversation {
  id: number;
  topic: string;
  peerName: string;
}
