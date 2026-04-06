import { Component } from 'react'

/**
 * Catches render errors in route content (wrapped around <Outlet /> in Layout).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route error boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || 'Unexpected error'
      return (
        <div className="error-boundary">
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-message">{message}</p>
          <button type="button" className="error-boundary-reload" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
