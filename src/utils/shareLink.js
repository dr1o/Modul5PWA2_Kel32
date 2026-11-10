export function buildProductShareUrl(gunId) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('gun', String(gunId))
  return url.toString()
}

export async function shareProduct(gun) {
  const id = gun?.id || gun?.name
  const shareUrl = buildProductShareUrl(id)

  let copied = false
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl)
      copied = true
    }
  } catch {
    copied = false
  }

  // Fallback for non-HTTPS or restricted clipboard contexts
  if (!copied) {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      copied = document.execCommand('copy')
      document.body.removeChild(textarea)
    } catch {
      copied = false
    }
  }

  // Also trigger native share sheet on mobile devices
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (isMobile && navigator.share) {
    try {
      await navigator.share({
        title: gun?.name || 'Bore & Barrel Hardware',
        text: `Check out ${gun?.name || 'this firearm'} at Bore & Barrel`,
        url: shareUrl,
      })
    } catch {
      // User dismissed share sheet; clipboard still holds URL
    }
  }

  return { url: shareUrl, copied }
}