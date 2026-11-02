/**
 * Bulletproof binary chunked uploader utility.
 * - Slices files into 2MB chunks.
 * - Sends chunks via application/octet-stream (raw binary) which bypasses
 *   multipart boundary parsing issues and Cloud Run request size limits.
 * - Automatic retry (3 attempts) on network interruption.
 * - Isolated from browser extension request interceptor interference.
 */

export function probeLocalMedia(
  file: File,
  type: 'video' | 'audio'
): Promise<{ duration: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const el = document.createElement(type) as HTMLVideoElement;
    el.preload = 'metadata';
    const blobUrl = URL.createObjectURL(file);
    el.src = blobUrl;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    };

    el.onloadedmetadata = () => {
      const duration = el.duration || 0;
      const width = el.videoWidth;
      const height = el.videoHeight;
      cleanup();
      resolve({ duration: isNaN(duration) ? 0 : duration, width, height });
    };

    el.onerror = () => {
      cleanup();
      resolve({ duration: 0 });
    };

    setTimeout(() => {
      cleanup();
      resolve({ duration: 0 });
    }, 4000);
  });
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for optimal transmission

// Send a single raw binary chunk with retries
async function sendRawChunkWithRetry(
  url: string,
  chunkBlob: Blob,
  retries = 3
): Promise<any> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try modern fetch first
      if (typeof window.fetch === 'function') {
        const response = await window.fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: chunkBlob,
        });

        if (response.ok) {
          const json = await response.json();
          return json;
        } else {
          let errText = `Server error ${response.status}`;
          try {
            const errJson = await response.json();
            if (errJson.error) errText = errJson.error;
          } catch {}
          throw new Error(errText);
        }
      }
    } catch (fetchErr: any) {
      lastError = fetchErr;
      // Fallback to XMLHttpRequest
      try {
        const xhrResult = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                resolve({ raw: xhr.responseText });
              }
            } else {
              reject(new Error(`Upload status ${xhr.status}: ${xhr.responseText}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network connection error'));
          xhr.ontimeout = () => reject(new Error('Network request timed out'));
          xhr.send(chunkBlob);
        });

        return xhrResult;
      } catch (xhrErr: any) {
        lastError = xhrErr;
      }
    }

    // Wait before retry
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, attempt * 400));
    }
  }

  throw lastError || new Error('Upload failed after retries');
}

export async function uploadMediaFile(
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<{ path: string; filename: string; size: number }> {
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  let finalResult: any = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const query = new URLSearchParams({
      uploadId,
      chunkIndex: i.toString(),
      totalChunks: totalChunks.toString(),
      filename: encodeURIComponent(file.name),
    });

    const url = `/api/upload-chunk?${query.toString()}`;

    const chunkResult = await sendRawChunkWithRetry(url, chunk, 3);

    if (onProgress) {
      const overallLoaded = start + chunk.size;
      const overallPct = Math.min(99, Math.round((overallLoaded / file.size) * 100));
      onProgress(overallPct);
    }

    if (chunkResult.done) {
      finalResult = chunkResult;
    }
  }

  if (onProgress) onProgress(100);

  if (!finalResult || !finalResult.path) {
    throw new Error('Upload server did not return a valid file path');
  }

  return finalResult;
}
