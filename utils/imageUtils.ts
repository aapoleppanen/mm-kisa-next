const isAbsoluteUrl = (url: string) => {
  var r = new RegExp('^(?:[a-z+]+:)?//', 'i');
  return r.test(url);
}

export function cloudStorageLoader ({ src }: { src: string }) {
  if (isAbsoluteUrl(src)) {
    return src
  }

  return `https://storage.googleapis.com/em-kisa-2024-bucket/${src}`
}
