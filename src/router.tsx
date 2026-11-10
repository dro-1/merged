import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { parseSearch, stringifySearch } from './helpers/search/url'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Readable filter URLs, e.g. ?langs=go&langs=rust, instead of JSON-encoded
    // arrays. Repeated keys survive the server's URLSearchParams normalisation.
    parseSearch,
    stringifySearch,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
