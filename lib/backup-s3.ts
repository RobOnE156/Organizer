import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Off-site backup target — any S3-compatible object storage (Cloudflare R2,
// Backblaze B2, Hetzner Object Storage, Wasabi, MinIO, …). Configured entirely
// through environment variables so the destination can be chosen/changed
// without code changes. Until these are set the backup simply stays dormant.
//
//   BACKUP_S3_ENDPOINT          e.g. https://<acct>.r2.cloudflarestorage.com
//   BACKUP_S3_REGION            e.g. auto | eu-central-1 (default "auto")
//   BACKUP_S3_BUCKET            the bucket name
//   BACKUP_S3_ACCESS_KEY_ID
//   BACKUP_S3_SECRET_ACCESS_KEY

export function backupConfigured(): boolean {
  return Boolean(
    process.env.BACKUP_S3_ENDPOINT &&
      process.env.BACKUP_S3_BUCKET &&
      process.env.BACKUP_S3_ACCESS_KEY_ID &&
      process.env.BACKUP_S3_SECRET_ACCESS_KEY,
  );
}

let cached: S3Client | null = null;
function client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    endpoint: process.env.BACKUP_S3_ENDPOINT,
    region: process.env.BACKUP_S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY ?? "",
    },
    // Path-style addressing works across all the S3-compatible providers above
    // (virtual-hosted style breaks on several of them).
    forcePathStyle: true,
  });
  return cached;
}

export async function putBackupObject(
  key: string,
  body: Uint8Array | Buffer | string,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.BACKUP_S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
