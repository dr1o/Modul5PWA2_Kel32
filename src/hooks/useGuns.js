import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'
import { getCachedQuery, setCachedQuery } from '../utils/queryCache'

export function useGuns(params = {}) {
  const [guns, setGuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(null)

  const paramKey = JSON.stringify(params)
  const cacheKey = `guns:${paramKey}`

  const fetchGuns = useCallback(
    async (forceRefresh = false) => {
      try {
        setError(null)
        if (!forceRefresh) {
          const cached = getCachedQuery(cacheKey)
          if (cached) {
            setGuns(cached.data || [])
            setPagination(cached.pagination || null)
            setLoading(false)
            return
          }
        }

        setLoading(true)
        const response = await gunService.getGuns(params)
        if (response.success) {
          const payload = {
            data: response.data || [],
            pagination: response.pagination || null,
          }
          setCachedQuery(cacheKey, payload)
          setGuns(payload.data)
          setPagination(payload.pagination)
        } else {
          setError(response.message || 'Failed to fetch products.')
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching products.')
        setGuns([])
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey],
  )

  useEffect(() => {
    fetchGuns(false)
  }, [fetchGuns])

  const refetch = useCallback(() => fetchGuns(true), [fetchGuns])

  return { guns, loading, error, pagination, refetch }
}

export function useGunById(id) {
  const [gun, setGun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGun = useCallback(
    async (forceRefresh = false) => {
      if (!id) {
        setLoading(false)
        return
      }
      const cacheKey = `gun:${id}`
      try {
        setError(null)
        if (!forceRefresh) {
          const cached = getCachedQuery(cacheKey)
          if (cached) {
            setGun(cached)
            setLoading(false)
            return
          }
        }

        setLoading(true)
        const response = await gunService.getGunById(id)
        if (response.success) {
          setCachedQuery(cacheKey, response.data)
          setGun(response.data)
        } else {
          setError(response.message || 'Product not found.')
        }
      } catch (err) {
        setError(err.message || 'Failed to load product details.')
        setGun(null)
      } finally {
        setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    fetchGun(false)
  }, [fetchGun])

  const refetch = useCallback(() => fetchGun(true), [fetchGun])

  return { gun, loading, error, refetch }
}