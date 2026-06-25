import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import App from '../App'

describe('App', () => {
  it('renderiza pantalla de login cuando no hay sesión', () => {
    localStorage.clear()
    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>,
    )
    expect(screen.getByText('Fundación Sarahuaro')).toBeDefined()
    expect(screen.getByText('Entrar')).toBeDefined()
  })
})
