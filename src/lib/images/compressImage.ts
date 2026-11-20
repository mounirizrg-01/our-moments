export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_OUTPUT_BYTES = 1 * 1024 * 1024

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image could not be read.'))
    }
    image.src = url
  })
}

export async function compressImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('The image must be smaller than 5 MB.')
  }

  const bitmap =
    typeof createImageBitmap === 'function' ? await createImageBitmap(file) : null
  const image = bitmap ?? (await loadImage(file))
  const sourceWidth = bitmap?.width ?? image.width
  const sourceHeight = bitmap?.height ?? image.height
  const scale = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))
  const context = canvas.getContext('2d')

  if (!context) {
    bitmap?.close()
    throw new Error('Image compression is unavailable in this browser.')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  bitmap?.close()

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const quality = Math.max(0.42, 0.82 - attempt * 0.08)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    )

    if (!blob) throw new Error('The image could not be compressed.')
    if (blob.size <= MAX_OUTPUT_BYTES) return blob

    if (attempt < 5) {
      const reducedWidth = Math.max(1, Math.round(canvas.width * 0.8))
      const reducedHeight = Math.max(1, Math.round(canvas.height * 0.8))
      const resized = document.createElement('canvas')
      resized.width = reducedWidth
      resized.height = reducedHeight
      const resizedContext = resized.getContext('2d')
      if (!resizedContext) {
        throw new Error('Image compression is unavailable in this browser.')
      }
      resizedContext.drawImage(canvas, 0, 0, reducedWidth, reducedHeight)
      canvas.width = resized.width
      canvas.height = resized.height
      const resizedCanvasContext = canvas.getContext('2d')
      if (!resizedCanvasContext) {
        throw new Error('Image compression is unavailable in this browser.')
      }
      resizedCanvasContext.drawImage(resized, 0, 0)
    }
  }

  throw new Error('This image could not be compressed below 1 MB. Try a smaller image.')
}
