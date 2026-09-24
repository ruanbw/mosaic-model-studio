import { expect, test, type Page } from '@playwright/test'

const appStorageKey = 'mosaic-model-studio'
const languageStorageKey = 'mosaic-language'

const setEnglish = async (page: Page) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, 'en')
  }, languageStorageKey)
}

const currentSettings = async (page: Page) => page.evaluate((key) => {
  const value = window.localStorage.getItem(key)
  return value ? JSON.parse(value) as { state?: Record<string, unknown> } : undefined
}, appStorageKey)

const waitForStudio = async (page: Page) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Make one idea/ })).toBeVisible()
}

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test.describe('responsive shell', () => {
  for (const width of [320, 390, 820, 821]) {
    test(`fits the ${width}px viewport without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await setEnglish(page)
      await waitForStudio(page)

      const mainBox = await page.getByRole('main').boundingBox()
      expect(mainBox?.x).toBeGreaterThanOrEqual(0)
      expect((mainBox?.x ?? 0) + (mainBox?.width ?? 0)).toBeLessThanOrEqual(width)

      const menuButton = page.getByRole('button', { name: 'Open navigation' })
      const desktopSidebar = page.locator('#workspace-sidebar-desktop')
      if (width < 821) {
        await expect(menuButton).toBeVisible()
        await expect(desktopSidebar).toBeHidden()
      } else {
        await expect(menuButton).toBeHidden()
        await expect(desktopSidebar).toBeVisible()
      }
    })
  }
})

test('Provider Dialog moves focus to the first invalid field and restores it on close', async ({ page }) => {
  await setEnglish(page)
  await waitForStudio(page)

  const opener = page.getByRole('button', { name: 'Add provider' }).first()
  await opener.click()

  const dialog = page.getByRole('dialog', { name: 'Add provider' })
  const name = page.locator('#provider-name')
  const baseUrl = page.locator('#provider-base-url')
  await expect(dialog).toBeVisible()
  await expect(name).toBeFocused()

  await dialog.getByRole('button', { name: 'Add provider', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Enter a provider name between 2 and 40 characters')
  await expect(name).toBeFocused()

  await name.fill('Playwright mock')
  await baseUrl.fill('http://provider.example.test/v1')
  await dialog.getByRole('button', { name: 'Add provider', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Only HTTPS or local HTTP URLs are allowed')
  await expect(baseUrl).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('theme selection updates and persists the document theme', async ({ page }) => {
  await setEnglish(page)
  await waitForStudio(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: /^Theme(?::|$)/ }).click()
  await page.getByRole('menuitemradio', { name: /Light/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await expect.poll(async () => (await currentSettings(page))?.state?.theme).toBe('light')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('static preview uses the built-in demo path without a provider request', async ({ page }) => {
  await setEnglish(page)
  const providerRequests: string[] = []
  page.on('request', (request) => {
    if (/api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|openrouter\.ai/.test(request.url())) {
      providerRequests.push(request.url())
    }
  })

  await waitForStudio(page)
  const result = page.getByRole('article').filter({ hasText: 'gpt-4o' }).first()
  await expect(result).toContainText(/Artifact ready|Complete/)
  const opener = result.getByRole('button', { name: 'Expand preview gpt-4o' }).first()
  await opener.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Static', { exact: true })).toBeVisible()
  const preview = dialog.frameLocator('iframe[title="gpt-4o — Expand preview"]')
  await expect(preview.getByText('orbit/', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()

  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  expect(providerRequests).toEqual([])
})

test('stopping a mocked provider request preserves a cancelled result', async ({ page }) => {
  await setEnglish(page)
  const settings = {
    providers: [{
      id: 'playwright-mock',
      name: 'Playwright mock',
      kind: 'openai',
      apiKey: 'e2e-placeholder-key',
      baseUrl: 'https://api.openai.test/v1',
      models: ['mock-model'],
      accent: '#8ef0c4',
      enabled: true,
    }],
    selectedModelKeys: ['playwright-mock::mock-model'],
    prompt: 'Create a deterministic mock result',
    demoMode: false,
    theme: 'dark',
  }
  await page.addInitScript(({ key, state }) => {
    window.localStorage.setItem(key, JSON.stringify({ state, version: 1 }))
  }, { key: appStorageKey, state: settings })

  const requestStarted = deferred()
  const releaseRequest = deferred()
  const requestHandled = deferred()
  await page.route('https://api.openai.test/v1/chat/completions', async (route) => {
    requestStarted.resolve()
    await releaseRequest.promise
    try {
      await route.abort('aborted')
    } catch {
      // The application may already have aborted the browser request.
    } finally {
      requestHandled.resolve()
    }
  })

  try {
    await waitForStudio(page)
    await page.getByRole('button', { name: /Generate pages/ }).click()
    await requestStarted.promise

    const result = page.getByRole('article').filter({ hasText: 'mock-model' })
    await page.getByRole('button', { name: 'Stop', exact: true }).click()
    await expect(result.getByText('Cancelled', { exact: true })).toBeVisible()
    await expect(result.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
  } finally {
    releaseRequest.resolve()
    await requestHandled.promise
  }
})
