// Re-export the interface and concrete provider.
// Import `storage` as the singleton to use throughout the app.

export { StorageProvider } from "./storage.provider";
export { S3StorageProvider } from "./s3.provider";

import { S3StorageProvider } from "./s3.provider";
import { StorageProvider } from "./storage.provider";

/**
 * Application-wide storage singleton.
 * Swap the implementation here to switch providers.
 */
export const storage: StorageProvider = new S3StorageProvider();
