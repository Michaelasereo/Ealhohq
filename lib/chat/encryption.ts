/**
 * AES-256-CBC encryption for chat message bodies at rest.
 * Key: CHAT_ENCRYPTION_KEY — 64 hex characters (32 bytes).
 */

function requireKeyBytes(): Uint8Array {
  const hex = process.env.CHAT_ENCRYPTION_KEY?.trim();
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      "CHAT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
    );
  }
  const buf = Buffer.from(hex, "hex");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export async function encryptMessage(
  plaintext: string,
): Promise<{ encrypted: string; iv: string }> {
  const keyBytes = requireKeyBytes();
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-CBC", length: 256 },
    false,
    ["encrypt"],
  );
  const data = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    data,
  );
  return {
    encrypted: Buffer.from(cipherBuf).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
  };
}

export async function decryptMessage(
  encrypted: string,
  iv: string,
): Promise<string> {
  const keyBytes = requireKeyBytes();
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-CBC", length: 256 },
    false,
    ["decrypt"],
  );
  const ivBuf = Buffer.from(iv, "base64");
  const cipher = Buffer.from(encrypted, "base64");
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: ivBuf },
    key,
    cipher,
  );
  return new TextDecoder().decode(plainBuf);
}
