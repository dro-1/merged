export const SITE_NAME = 'merged'

export const SITE_DESCRIPTION =
  'Find open-source repos ready for your first contribution.'

/**
 * Public origin of the deployed site with no trailing slash, used for absolute URLs
 * such as share images. Read from VITE_SITE_URL at build time, else localhost.
 */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'http://localhost:3000'
).replace(/\/+$/, '')
