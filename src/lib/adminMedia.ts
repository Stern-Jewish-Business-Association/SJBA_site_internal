const THUMBNAIL_MAX_DIMENSION = 720
const THUMBNAIL_QUALITY = 0.82

const fileExtension = (fileName: string) => {
  const match = fileName.match(/(\.[A-Za-z0-9]+)$/)
  return match?.[1]?.toLowerCase() ?? ''
}

export const makeStoragePath = (prefix: string, file: File) => {
  const safeName = file.name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._/-]/g, '')
    .toLowerCase()

  return `${prefix}/${Date.now()}-${safeName || 'image'}`
}

export const getThumbnailPath = (path: string) => {
  const extension = fileExtension(path)
  const withoutExtension = extension ? path.slice(0, -extension.length) : path
  return `thumbnails/${withoutExtension}.jpg`
}

export const getStoragePublicUrl = (bucketId: string, path: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
  if (!supabaseUrl || !path) return ''

  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketId)}/${encodedPath}`
}

const loadImage = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  if ('createImageBitmap' in window) {
    return window.createImageBitmap(file)
  }

  return await new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('The selected image could not be decoded.'))
    }
    image.src = objectUrl
  })
}

export const createJpegThumbnail = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Select an image file to generate a thumbnail.')
  }

  const image = await loadImage(file)
  const sourceWidth = image.width
  const sourceHeight = image.height
  const scale = Math.min(1, THUMBNAIL_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('This browser cannot create image thumbnails.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  if ('close' in image && typeof image.close === 'function') image.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Thumbnail generation failed.'))),
      'image/jpeg',
      THUMBNAIL_QUALITY
    )
  })

  const thumbnailName = `${file.name.replace(/\.[^.]+$/, '') || 'thumbnail'}.jpg`
  return new File([blob], thumbnailName, { type: 'image/jpeg' })
}
