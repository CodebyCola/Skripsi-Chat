import type http from 'node:http';

export function parseJsonBody<T = any>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

    req.on('end', () => {
      if (chunks.length === 0) return resolve({} as T);
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(raw) as T);
      } catch (err) {
        reject(new Error('Format JSON pada request body tidak valid'));
      }
    });

    req.on('error', reject);
  });
}
