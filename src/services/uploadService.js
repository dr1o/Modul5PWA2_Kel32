import axios from 'axios'
import { BASE_URL, SUPABASE_KEY, IS_SUPABASE } from '../config/api'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

class UploadService {
  async uploadImage(file) {
    if (!file) {
      throw new Error('No file provided.')
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        'Invalid file type. Allowed formats: .jpg, .jpeg, .png, .webp',
      )
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('File size exceeds the 5 MB limit.')
    }

    if (IS_SUPABASE) {
      const ext = file.name.split('.').pop() || 'png'
      const fileName = `gun_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`
      const bucketName = 'guns'
      try {
        const uploadUrl = `${BASE_URL}/storage/v1/object/${bucketName}/${fileName}`
        const uploadHeaders = {
          'Content-Type': file.type,
          apikey: SUPABASE_KEY,
        }
        if (SUPABASE_KEY.startsWith('eyJ')) {
          uploadHeaders.Authorization = `Bearer ${SUPABASE_KEY}`
        }
        await axios.post(uploadUrl, file, {
          headers: uploadHeaders,
          timeout: 30000,
        })
        const publicUrl = `${BASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`
        return {
          success: true,
          data: { url: publicUrl, filename: fileName },
        }
      } catch (err) {
        console.warn('Supabase bucket upload failed, using base64 data URL:', err)
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        return {
          success: true,
          data: { url: dataUrl, filename: file.name },
        }
      }
    }

    const formData = new FormData()
    formData.append('image', file)
    const response = await axios.post(`${BASE_URL}/api/v1/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    })
    return response.data
  }
}

export default new UploadService()