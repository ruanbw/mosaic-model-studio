// Applies the saved theme before first paint. Loaded as a classic script in <head>
// so it runs synchronously, before the app bundle, and CSP can drop unsafe-inline.
(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('mosaic-model-studio') || '{}')
    const preference = saved.state?.theme || 'dark'
    const resolved = preference === 'system'
      ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : preference
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f4f6f3' : '#101217')
  } catch {
    document.documentElement.dataset.theme = 'dark'
  }
})()
