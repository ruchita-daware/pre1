'use client'

import { useEffect, useState } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; traceId?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const referenceId = error.digest || error.traceId || 'PRE-CRITICAL'

  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    Boolean(
      error?.message &&
        /loading chunk|failed to fetch dynamically imported module|missing in assets manifest/i.test(error.message)
    )

  useEffect(() => {
    if (isChunkError && typeof window !== 'undefined') {
      const retryKey = 'preone_global_chunk_reload_' + window.location.pathname
      const lastRetry = sessionStorage.getItem(retryKey)
      const now = Date.now()
      if (!lastRetry || now - parseInt(lastRetry, 10) > 12000) {
        sessionStorage.setItem(retryKey, now.toString())
        window.location.reload()
      }
    }
  }, [isChunkError])

  const copyTrace = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(referenceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    } else {
      reset()
    }
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {isChunkError ? 'Application Updated' : 'Application Error'}
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            {isChunkError
              ? 'A recent update or restart refreshed application assets. Reloading will fetch the latest version.'
              : 'A critical interface error occurred. Please refresh the page or share the reference code with PreOne support.'}
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-700 font-bold">{referenceId}</span>
            <button
              onClick={copyTrace}
              className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-100"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReload}
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700"
            >
              {isChunkError ? 'Reload Page' : 'Reload App'}
            </button>
            <a
              href="/app"
              className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 text-center"
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
