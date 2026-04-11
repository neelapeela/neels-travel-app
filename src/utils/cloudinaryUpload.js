/**
 * Client-side upload via Cloudinary unsigned preset.
 * In the Cloudinary console: Settings → Upload → Upload presets → add unsigned preset,
 * restrict to images, set a dedicated folder (e.g. trip-tickets), and optional max file size.
 */
export function isCloudinaryConfigured() {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  return Boolean(cloud && preset && String(cloud).trim() && String(preset).trim())
}

/**
 * @param {File} file
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadTicketScreenshot(file) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.')
  }
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME.trim()
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET.trim()

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', uploadPreset)
  body.append('folder', 'trip-tickets')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || 'Upload failed'
    throw new Error(msg)
  }
  if (!data.secure_url) {
    throw new Error('Upload did not return an image URL.')
  }

  return {
    url: data.secure_url,
    publicId: typeof data.public_id === 'string' ? data.public_id : ''
  }
}
