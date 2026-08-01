import { v2 as cloudinary } from "cloudinary";

/** Signed direct-to-Cloudinary upload — the same pattern this app already
 *  uses for CloudConvert (the browser uploads the actual file bytes straight
 *  to the third party; our server only ever hands out a short-lived signed
 *  authorization, never touches or proxies the file itself). The API secret
 *  never leaves the server. */
export function createUploadSignature(folder: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary isn't configured yet — CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are missing on the server.",
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return { signature, timestamp, apiKey, cloudName, folder };
}

/** Deletes an uploaded asset from Cloudinary by its public ID — used when a
 *  blog post (or its thumbnail) is removed, so storage doesn't accumulate
 *  orphaned images. Unlike `createUploadSignature`, this makes a real API
 *  call, so the SDK needs `cloudinary.config()` set first. */
export async function deleteUploadedImage(publicId: string): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary isn't configured yet — CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are missing on the server.",
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  await cloudinary.uploader.destroy(publicId);
}
