import { forwardRef, useId } from 'react'

const Input = forwardRef(function Input(
  { label, id: idProp, className = '', wrapperClassName = '', ...props },
  ref
) {
  const genId = useId()
  const id = idProp || genId

  const input = (
    <input ref={ref} id={id} className={['ui-input', className].filter(Boolean).join(' ')} {...props} />
  )

  if (!label) {
    return <div className={wrapperClassName}>{input}</div>
  }

  return (
    <div className={['ui-field', wrapperClassName].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="ui-label">
        {label}
      </label>
      {input}
    </div>
  )
})

export default Input
