const isAbsoluteUrl = (url: string) => /^(?:[a-z+]+:)?\/\//i.test(url);

export function storageUrl(src: string): string {
  if (!src) return "";
  if (isAbsoluteUrl(src)) return src;

  // R2 public URL takes priority when configured
  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (r2Base) return `${r2Base}/${src}`;

  // Fallback to legacy GCS bucket
  return `https://storage.googleapis.com/em-kisa-2024-bucket/${src}`;
}

// Alias kept for backwards compatibility within this codebase
export const cloudStorageLoader = ({ src }: { src: string }) => storageUrl(src);
