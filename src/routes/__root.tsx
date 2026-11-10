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
import { DEFAULT_REPO_FILTERS } from '#/helpers/search/filters'
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
      {
        title: 'merged',
      },
    ],
    links: [
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
