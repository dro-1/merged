import { useEffect } from 'react'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { StatusMessage, statusActionClass } from '#/components/StatusMessage'
import { UMAMI_WEBSITE_ID } from '#/helpers/analytics'
import { DEFAULT_REPO_FILTERS } from '#/helpers/search/filters'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#/helpers/site'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: SITE_NAME },
      { name: 'description', content: SITE_DESCRIPTION },
      // Share previews; crawlers need absolute URLs, hence SITE_URL.
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: SITE_NAME },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:url', content: `${SITE_URL}/` },
      { property: 'og:image', content: `${SITE_URL}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: `${SITE_NAME}: ${SITE_DESCRIPTION}`,
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: `${SITE_URL}/` },
      { name: 'twitter:title', content: SITE_NAME },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: `${SITE_URL}/twitter-card.png` },
    ],
    links: [
      // Filtered search URLs canonicalise to the home page, so crawlers index one page.
      { rel: 'canonical', href: `${SITE_URL}/` },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
    scripts: [
      // Cookieless page views (including client-side navigations) and events;
      // data-domains keeps local dev and deploy previews out of the stats.
      {
        src: 'https://cloud.umami.is/script.js',
        defer: true,
        'data-website-id': UMAMI_WEBSITE_ID,
        'data-domains': 'merged.seuntee.dev',
      },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

/** Last-resort error page for failures no route handled itself. */
function RootError({ error }: ErrorComponentProps) {
  const router = useRouter()

  useEffect(() => {
    console.error('[app]', error)
  }, [error])

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <StatusMessage
        title="Something went wrong"
        message="The page couldn't be displayed."
      >
        <button
          type="button"
          onClick={() => void router.invalidate()}
          className={statusActionClass}
        >
          Try again
        </button>
        <Link
          to="/"
          search={DEFAULT_REPO_FILTERS}
          className={statusActionClass}
        >
          Go home
        </Link>
      </StatusMessage>
    </main>
  )
}

function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <StatusMessage
        title="Page not found"
        message="There's nothing at this address."
      >
        <Link
          to="/"
          search={DEFAULT_REPO_FILTERS}
          className={statusActionClass}
        >
          Go home
        </Link>
      </StatusMessage>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Rendered directly: head() keeps only one meta per name, and the
            browser UI colour needs one per colour scheme. */}
        <meta
          name="theme-color"
          content="#f7f8fa"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#0f1218"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
