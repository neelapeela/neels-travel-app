export default function Card({ children, className = '', padded = true, as: Component = 'div', ...rest }) {
  const pad = padded ? 'ui-card--padded' : ''
  return (
    <Component className={['ui-card', pad, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Component>
  )
}
