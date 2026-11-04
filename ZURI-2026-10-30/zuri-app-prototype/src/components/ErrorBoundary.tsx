import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="h-full flex flex-col items-center justify-center gap-4 p-6 text-eco-text font-body text-center">
      <h1 className="font-display text-xl font-black">This screen could not open</h1>
      <p>Your saved prototype records are still in this browser.</p>
      <button className="p-3 rounded-xl bg-eco-surface2" onClick={() => { window.location.hash = '/'; window.location.reload() }}>Return to Zuri home</button>
    </main>
  }
}
