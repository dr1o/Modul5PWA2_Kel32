import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { formatPrice, truncate } from '../../utils/helpers'
import { shareProduct } from '../../utils/shareLink'

export default function GunCard({ gun, onSelect, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false)
  const imgSrc = gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  const handleShare = async (e) => {
    e.stopPropagation()
    const result = await shareProduct(gun)
    if (result.copied) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <img
          className="card-img"
          src={imgSrc}
          alt={gun.name}
          width="240"
          height="180"
          loading="lazy"
          decoding="async"
        />
        <span className="name display">{gun.name}</span>
        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>
        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}
        <span className="price">{formatPrice(price)}</span>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        <button
          type="button"
          className={`card-act-btn${copied ? ' card-act-btn--copied' : ''}`}
          onClick={handleShare}
          aria-label={`Share link for ${gun.name}`}
          title={copied ? 'Link copied!' : 'Copy share link'}
        >
          {copied ? <Check size={15} stroke="#1e8449" /> : <Share2 size={15} />}
        </button>
        <FavoriteButton gunId={gun.id || gun.name} />
        {onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(gun)
            }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(gun)
            }}
            aria-label={`Delete ${gun.name}`}
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>
    </li>
  )
}