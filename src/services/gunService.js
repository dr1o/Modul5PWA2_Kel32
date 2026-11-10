import { apiClient, IS_SUPABASE } from '../config/api'
import { invalidateCache, invalidateCacheByPrefix } from '../utils/queryCache'

export const normalizeProduct = (item) => {
  if (!item) return null

  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : [
          'Verify firearm is completely unloaded and point in safe direction.',
          'Inspect receiver and mechanism for maintenance.',
        ]

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: item.image_url || item.image || '/guns/pistol.svg',
    image: item.image_url || item.image || '/guns/pistol.svg',
    ingredients: specsList,
    steps: stepsList,
  }
}

class GunService {
  async getGuns(params = {}) {
    if (IS_SUPABASE) {
      const page = Math.max(1, Number(params.page) || 1)
      const limit = Math.max(1, Number(params.limit) || 6)
      const offset = (page - 1) * limit

      const queryParts = ['select=*']
      if (params.search) {
        queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      }
      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }
      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
      } else {
        queryParts.push('order=created_at.desc')
      }
      queryParts.push(`limit=${limit}`)
      queryParts.push(`offset=${offset}`)

      const queryString = queryParts.join('&')
      const res = await apiClient.get(`/rest/v1/products?${queryString}`, {
        rawResponse: true,
        headers: { Prefer: 'count=exact' },
      })

      const rows = Array.isArray(res.data) ? res.data : []
      const list = rows.map(normalizeProduct)

      let total = list.length
      const contentRange = res.headers?.['content-range']
      if (contentRange && contentRange.includes('/')) {
        const totalStr = contentRange.split('/')[1]
        if (totalStr && totalStr !== '*') {
          total = Number(totalStr) || 0
        }
      }

      return {
        success: true,
        data: list,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      }
    }

    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    )
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  async getGunById(id) {
    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, data: normalizeProduct(data[0]) }
      }
      throw new Error('Hardware item not found.')
    }
    return apiClient.get(`/api/v1/recipes/${id}`)
  }

  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []
      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        steps: Array.isArray(data.steps) ? data.steps : [],
        image_url: data.image_url || null,
      }
      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      invalidateCacheByPrefix('guns:')
      const created = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(created) }
    }
    const res = await apiClient.post('/api/v1/recipes', data)
    invalidateCacheByPrefix('guns:')
    return res
  }

  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined
      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray
      if (Array.isArray(data.steps)) payload.steps = data.steps
      if (data.image_url !== undefined) payload.image_url = data.image_url

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      invalidateCacheByPrefix('guns:')
      invalidateCache(`gun:${id}`)
      const updated = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(updated) }
    }
    const res = await apiClient.put(`/api/v1/recipes/${id}`, data)
    invalidateCacheByPrefix('guns:')
    invalidateCache(`gun:${id}`)
    return res
  }

  async patchGun(id, data) {
    if (IS_SUPABASE) {
      return this.updateGun(id, data)
    }
    const res = await apiClient.patch(`/api/v1/recipes/${id}`, data)
    invalidateCacheByPrefix('guns:')
    invalidateCache(`gun:${id}`)
    return res
  }

  async deleteGun(id) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      invalidateCacheByPrefix('guns:')
      invalidateCache(`gun:${id}`)
      return { success: true }
    }
    const res = await apiClient.delete(`/api/v1/recipes/${id}`)
    invalidateCacheByPrefix('guns:')
    invalidateCache(`gun:${id}`)
    return res
  }
}

export default new GunService()