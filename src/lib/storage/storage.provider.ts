/**
 * Storage provider abstraction.
 * Any future provider (GCS, Azure Blob, etc.) must implement this interface.
 */
export interface StorageProvider {
  /**
   * Upload a file and return its public URL.
   * @param key     - The destination path/key within the bucket
   * @param buffer  - Raw file bytes
   * @param mimeType - MIME type of the file
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;

  /**
   * Delete a file by its storage key.
   */
  delete(key: string): Promise<void>;
}
