/** Client-side half of the signed direct-to-Cloudinary upload flow — shared
 *  by every admin rich text editor (blog post content, tool-content guide/
 *  FAQ) that lets images be inserted inline. Each caller has its own signed-
 *  URL endpoint (so uploads land in their own Cloudinary folder), but the
 *  fetch-signature-then-POST-to-Cloudinary mechanics are identical. */
export async function uploadImageViaSignedEndpoint(
  file: File,
  signatureEndpoint: string,
): Promise<{ url: string; publicId: string }> {
  const sigRes = await fetch(signatureEndpoint, { method: "POST" });
  if (!sigRes.ok) {
    const body = await sigRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Couldn't get an upload signature.");
  }
  const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!uploadRes.ok) throw new Error("Uploading to Cloudinary failed.");
  const data = await uploadRes.json();
  return { url: data.secure_url as string, publicId: data.public_id as string };
}
