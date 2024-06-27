const projectId = "dghnqhlbgdslfaywirep"

const isAbsoluteUrl = (url) => {
  var r = new RegExp('^(?:[a-z+]+:)?//', 'i');
  return r.test(url);
}

export default function supabaseLoader({ src, width, quality }) {
  if (isAbsoluteUrl(src)) {
    return src
  }
  if (src.startsWith('/public/assets')) {
    return `http://localhost:3000/_next/static/media${src}`;
  }

  // hotfix: this should use the same image from Google Cloud Storage
  return `https://storage.googleapis.com/em-kisa-2024-bucket/${src}`

  return `https://${projectId}.supabase.co/storage/v1/object/public/em-kisa-next/${src}?width=${width}&quality=${quality || 75}`
}
