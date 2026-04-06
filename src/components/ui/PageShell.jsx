export default function PageShell({ children, className = '', variant = 'padded' }) {
  const v =
    variant === 'center' ? 'ui-page-shell ui-page-shell--center' : 'ui-page-shell ui-page-shell--padded'
  return <div className={[v, className].filter(Boolean).join(' ')}>{children}</div>
}
