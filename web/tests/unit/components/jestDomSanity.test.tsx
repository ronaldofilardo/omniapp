import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'

describe('jest-dom sanity', () => {
  it('should have toBeInTheDocument matcher available', () => {
    render(<div>hello</div>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})

