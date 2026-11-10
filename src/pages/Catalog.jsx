import { useState, useMemo, useEffect } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

const ITEMS_PER_PAGE = 6
const BASE_CATEGORIES = ['Pistol', 'Rifle', 'Shotgun', 'Submachine Gun']

export default function Catalog({ onNavigate }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [useLocal, setUseLocal] = useState(false)

  // Debounce search input so Supabase isn't spammed on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Live API with server-side pagination + query caching
  const {
    guns: apiGuns,
    loading,
    error,
    pagination,
    refetch,
  } = useGuns({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch,
    category: activeCategory,
    sort_by: sortKey,
    order: sortOrder,
  })

  const isLocalMode = useLocal || Boolean(error && apiGuns.length === 0)

  const localFilteredAll = useMemo(() => {
    if (!isLocalMode) return []
    const enriched = GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
    const filtered = enriched.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(filtered, sortKey, sortOrder)
  }, [isLocalMode, search, activeCategory, sortKey, sortOrder])

  const totalItems = isLocalMode
    ? localFilteredAll.length
    : pagination?.total ?? apiGuns.length

  const totalPages = isLocalMode
    ? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
    : pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const displayedGuns = useMemo(() => {
    if (isLocalMode) {
      const start = (page - 1) * ITEMS_PER_PAGE
      return localFilteredAll.slice(start, start + ITEMS_PER_PAGE)
    }
    return apiGuns
  }, [isLocalMode, localFilteredAll, apiGuns, page])

  const categories = useMemo(() => {
    const merged = new Set([
      ...BASE_CATEGORIES,
      ...extractCategories(displayedGuns).filter((c) => c !== 'All'),
    ])
    return ['All', ...Array.from(merged).sort()]
  }, [displayedGuns])

  // Fallback local detail state if Catalog rendered standalone
  const [selectedGun, setSelectedGun] = useState(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')
      await gunService.deleteGun(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => {
          setSelectedGun(null)
          setDeleteTarget(g)
        }}
      />
    )
  }

  const startItem = totalItems === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(page * ITEMS_PER_PAGE, totalItems)

  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {totalItems} piece{totalItems !== 1 ? 's' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        <AdvancedFilter
          search={search}
          onSearch={(val) => {
            setSearch(val)
            setPage(1)
          }}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={(cat) => {
            setActiveCategory(cat)
            setPage(1)
          }}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
            setPage(1)
          }}
        />

        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && displayedGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {!loading && displayedGuns.length > 0 && (
          <>
            <ul className="stock">
              {displayedGuns.map((gun) => (
                <GunCard
                  key={gun.id || gun.name}
                  gun={gun}
                  onSelect={(g) =>
                    onNavigate ? onNavigate('Detail', g) : setSelectedGun(g)
                  }
                  onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                  onDelete={setDeleteTarget}
                />
              ))}
            </ul>

            {/* Pagination Bar */}
            <nav className="pagination" aria-label="Catalog pagination">
              <span className="pagination-info">
                Showing {startItem}–{endItem} of {totalItems} (Page {page} of {totalPages})
              </span>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={15} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`page-num-btn${page === num ? ' page-num-btn--active' : ''}`}
                    onClick={() => {
                      setPage(num)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    aria-current={page === num ? 'page' : undefined}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </nav>
          </>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setUseLocal(false)
                refetch()
              }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError('')
        }}
      />
      {deleteError && <div className="toast toast--error">{deleteError}</div>}
    </>
  )
}