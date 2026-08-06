import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "../../config/env";
import { StorageProvider } from "./storage.provider";

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      // IMPORTANT: AWS_REGION in Railway env vars MUST match the actual S3 bucket region.
      // If you get "PermanentRedirect" errors, verify the bucket region in AWS Console
      // and update the AWS_REGION variable in Railway to match exactly.
    });
    this.bucket = env.AWS_S3_BUCKET;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Files are publicly readable via CloudFront / S3 public bucket policy
      // Do NOT set ACL here — rely on bucket policy for public access
    });

    await this.client.send(command);

    // Return a standard S3 URL (works when bucket is public or behind CloudFront)
    return `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }
}
