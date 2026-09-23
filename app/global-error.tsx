'use client'

/**
 * Global error boundary — catches errors in the root layout itself.
 * This component must render its own <html> and <body> tags because
 * the root layout has already failed at this point.
 */
// `error` stays in the prop type (Next passes it) but this boundary only offers a retry.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0f1a',
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Something Went Wrong
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 24 }}>
            A critical error occurred. You can try reloading the page or return to the home page.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#22d3ee',
                color: '#0a0f1a',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <a
              href="/home"
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Return to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
