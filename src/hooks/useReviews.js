import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import { getCachedQuery, setCachedQuery } from '../utils/queryCache'

export function useReviews(gunId) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchReviews = useCallback(
    async (forceRefresh = false) => {
      if (!gunId || String(gunId).startsWith('local-')) {
        setLoading(false)
        return
      }
      const cacheKey = `reviews:${gunId}`
      try {
        setError(null)
        if (!forceRefresh) {
          const cached = getCachedQuery(cacheKey)
          if (cached) {
            setReviews(cached)
            setLoading(false)
            return
          }
        }

        setLoading(true)
        const response = await reviewService.getReviews(gunId)
        if (response.success) {
          const list = response.data || []
          setCachedQuery(cacheKey, list)
          setReviews(list)
        } else {
          setError(response.message || 'Failed to fetch reviews.')
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching reviews.')
        setReviews([])
      } finally {
        setLoading(false)
      }
    },
    [gunId],
  )

  useEffect(() => {
    fetchReviews(false)
  }, [fetchReviews])

  const refetch = useCallback(() => fetchReviews(true), [fetchReviews])

  return { reviews, loading, error, refetch }
}

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      const response = await reviewService.createReview(gunId, reviewData)
      if (response.success) {
        setSuccess(true)
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}