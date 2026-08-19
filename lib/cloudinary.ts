import { v2 as cloudinary } from "cloudinary";

function requireCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary isn't configured yet — CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are missing on the server.",
    );
  }
  return { cloudName, apiKey, apiSecret };
}

/** Signed direct-to-Cloudinary upload — the same pattern this app already
 *  uses for CloudConvert (the browser uploads the actual file bytes straight
 *  to the third party; our server only ever hands out a short-lived signed
 *  authorization, never touches or proxies the file itself). The API secret
 *  never leaves the server.
 *
 *  `type: "authenticated"` (used for ticket attachments — see
 *  app/api/tickets/upload-signature) uploads the asset as private: its plain
 *  Cloudinary URL 404s for anyone, including someone with the link. Reading
 *  it back requires a signed URL minted by getAttachmentDeliveryUrl below,
 *  which this app only ever does from an ownership/permission-gated code
 *  path. `allowedFormats` is enforced by Cloudinary itself as part of the
 *  signature — a tampered client request outside that list is rejected
 *  server-side, not just hidden by the file picker's `accept` attribute. */
export function createUploadSignature(
  folder: string,
  options?: { type?: "upload" | "authenticated"; allowedFormats?: string[] },
) {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  if (options?.type) paramsToSign.type = options.type;
  const allowedFormats = options?.allowedFormats?.join(",");
  if (allowedFormats) paramsToSign.allowed_formats = allowedFormats;

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return { signature, timestamp, apiKey, cloudName, folder, type: options?.type, allowedFormats };
}

/** Deletes an uploaded asset from Cloudinary by its public ID — used when a
 *  blog post (or its thumbnail) is removed, so storage doesn't accumulate
 *  orphaned images. Unlike `createUploadSignature`, this makes a real API
 *  call, so the SDK needs `cloudinary.config()` set first. */
export async function deleteUploadedImage(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  await cloudinary.uploader.destroy(publicId);
}

/** Mints a signed, time-scoped delivery URL for a private ("authenticated"
 *  type) asset — see createUploadSignature above. Call this only from a
 *  code path that has already verified the caller is allowed to see this
 *  specific attachment (a ticket's owner, or staff with ticket access — see
 *  lib/tickets.ts's getTicketForUser/getTicketForAdmin), since the returned
 *  URL is themselves the access control from that point on. */
export function getAttachmentDeliveryUrl(publicId: string, resourceType: string): string {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return cloudinary.url(publicId, {
    type: "authenticated",
    resource_type: resourceType || "auto",
    sign_url: true,
    secure: true,
  });
}
