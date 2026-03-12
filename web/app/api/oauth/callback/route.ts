import { NextRequest } from 'next/server'

/**
 * GET /api/oauth/callback?oauth_success=provider
 * Lightweight endpoint that closes the OAuth popup and signals the opener.
 * Uses localStorage event for cross-window communication (reliable even
 * when window.opener is cleared by cross-origin redirects).
 */
const ALLOWED_PROVIDERS = ['github', 'dropbox', 'google-drive', 'onedrive', 'box', 's3', 'gcs', 'unknown']

export async function GET(request: NextRequest) {
  const rawProvider = request.nextUrl.searchParams.get('oauth_success') || 'unknown'
  // Validate against allowlist to prevent reflected XSS via template injection
  const provider = ALLOWED_PROVIDERS.includes(rawProvider) ? rawProvider : 'unknown'

  const html = `<!DOCTYPE html>
<html>
<head><title>Connected</title></head>
<body>
<script>
  // Signal the opener via localStorage (works across same-origin windows)
  try { localStorage.setItem('oauth-success', '${provider}'); } catch(e) {}
  // Also try postMessage as backup
  try { if (window.opener) window.opener.postMessage({ type: 'oauth-success', provider: '${provider}' }, '*'); } catch(e) {}
  // Always try to close
  window.close();
  // If close didn't work (shouldn't happen), show fallback
  setTimeout(function() {
    document.body.innerHTML = '<p style="font-family:sans-serif;text-align:center;margin-top:40px;">Connected successfully!<br><a href="/connected-services">Return to Connected Services</a></p>';
  }, 500);
</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
