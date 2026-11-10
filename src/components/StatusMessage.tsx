type StatusMessageProps = {
  title: string
  message: string
  /** Buttons or links offered to recover, e.g. "Try again". */
  children?: React.ReactNode
}

/** A centred notice for a page or section that couldn't show its usual content. */
export function StatusMessage({
  title,
  message,
  children,
}: StatusMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-line bg-card px-6 py-12 text-center"
    >
      <h2 className="font-semibold text-fg">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {children && (
        <div className="mt-5 flex justify-center gap-3">{children}</div>
      )}
    </div>
  )
}

/** Shared look for the recovery actions placed inside a StatusMessage. */
export const statusActionClass =
  'rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-fg shadow-xs transition-colors hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
