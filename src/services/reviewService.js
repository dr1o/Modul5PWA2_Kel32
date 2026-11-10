import { apiClient, IS_SUPABASE } from '../config/api'
import { invalidateCache, invalidateCacheByPrefix } from '../utils/queryCache'

class ReviewService {
  async getReviews(gunId) {
    if (IS_SUPABASE) {
      const data = await apiClient.get(
        `/rest/v1/reviews?product_id=eq.${gunId}&select=*&order=created_at.desc`,
      )
      const list = Array.isArray(data)
        ? data.map((r) => ({
            id: r.id,
            product_id: r.product_id,
            user_identifier: r.user_id
              ? `Operator ${String(r.user_id).substring(0, 8)}`
              : 'Anonymous',
            rating: r.rating,
            comment: r.comment || '',
            created_at: r.created_at,
          }))
        : []
      return { success: true, data: list }
    }
    return apiClient.get(`/api/v1/recipes/${gunId}/reviews`)
  }

  async createReview(gunId, reviewData) {
    if (IS_SUPABASE) {
      const payload = {
        product_id: Number(gunId),
        user_id: reviewData.user_id || reviewData.user_identifier,
        rating: Number(reviewData.rating),
        comment: reviewData.comment || '',
      }
      const res = await apiClient.post('/rest/v1/reviews', payload, {
        headers: { Prefer: 'return=representation' },
      })
      invalidateCache(`reviews:${gunId}`)
      const created = Array.isArray(res) ? res[0] : res
      return { success: true, data: created }
    }
    const res = await apiClient.post(`/api/v1/recipes/${gunId}/reviews`, reviewData)
    invalidateCache(`reviews:${gunId}`)
    return res
  }

  async updateReview(reviewId, reviewData) {
    if (IS_SUPABASE) {
      const res = await apiClient.patch(
        `/rest/v1/reviews?id=eq.${reviewId}`,
        {
          rating: Number(reviewData.rating),
          comment: reviewData.comment,
        },
        { headers: { Prefer: 'return=representation' } },
      )
      invalidateCacheByPrefix('reviews:')
      return { success: true, data: Array.isArray(res) ? res[0] : res }
    }
    const res = await apiClient.put(`/api/v1/reviews/${reviewId}`, reviewData)
    invalidateCacheByPrefix('reviews:')
    return res
  }

  async deleteReview(reviewId) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/reviews?id=eq.${reviewId}`)
      invalidateCacheByPrefix('reviews:')
      return { success: true }
    }
    const res = await apiClient.delete(`/api/v1/reviews/${reviewId}`)
    invalidateCacheByPrefix('reviews:')
    return res
  }
}

export default new ReviewService()