export interface StegoImageRecord {
  id: number;
  title: string;
  storedPngName: string;
  imageDataUrl?: string;
  width: number;
  height: number;
  embeddedBitsCount: number;
  psnrDb: number;
  mse: number;
  createdAt?: string;
}

export interface EmbedMessagePayload {
  title: string;
  secretMessage: string;
  passkey: string;
  coverPngBase64?: string;
}
