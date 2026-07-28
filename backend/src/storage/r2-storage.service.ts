// R2 Storage Service for Cloudflare
// Provides file upload/download/delete using Cloudflare R2

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export class R2StorageService {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async upload(
    key: string,
    body: ReadableStream | ArrayBuffer | Uint8Array | string,
    contentType: string = 'application/octet-stream',
  ): Promise<UploadResult> {
    await this.bucket.put(key, body, {
      httpMetadata: { contentType },
    });

    return {
      key,
      url: `/storage/${encodeURIComponent(key)}`,
      size: body instanceof ArrayBuffer ? body.byteLength : 0,
      contentType,
    };
  }

  async download(key: string): Promise<R2ObjectBody | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;
    return object as R2ObjectBody;
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    await this.bucket.delete(keys);
  }

  async list(prefix?: string, limit?: number): Promise<R2Object[]> {
    const listed = await this.bucket.list({ prefix, limit });
    return listed.objects;
  }

  async getMetadata(key: string): Promise<R2Object | null> {
    return await this.bucket.head(key);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    // R2 doesn't support signed URLs directly, return the direct URL
    // For private buckets, implement JWT-based access control
    return `/storage/${encodeURIComponent(key)}`;
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const source = await this.bucket.get(sourceKey);
    if (source) {
      await this.bucket.put(destinationKey, source.body, {
        httpMetadata: source.httpMetadata,
      });
    }
  }

  async getStorageUsage(): Promise<{ totalObjects: number; totalSize: number }> {
    let totalObjects = 0;
    let totalSize = 0;
    let cursor: string | undefined;

    do {
      const listed = await this.bucket.list({ limit: 1000, cursor });
      totalObjects += listed.objects.length;
      listed.objects.forEach((obj) => {
        totalSize += obj.size;
      });
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    return { totalObjects, totalSize };
  }
}
