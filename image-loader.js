const projectId = "dghnqhlbgdslfaywirep"

const isAbsoluteUrl = (url) => {
  var r = new RegExp('^(?:[a-z+]+:)?//', 'i');
  return r.test(url);
}

export default function supabaseLoader({ src, width, quality }) {
  if (isAbsoluteUrl(src)) {
    return src
  }

  console.log(projectId)

  return `https://${projectId}.supabase.co/storage/v1/object/public/em-kisa-next/${src}?width=${width}&quality=${quality || 75}`
}
