import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register(form)
      login(data.access_token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ color: '#166534', marginBottom: '0.25rem', fontSize: '1.5rem', fontWeight: 700 }}>Start Free Trial</h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>14 days free — no credit card required</p>
        {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {[
            { key: 'full_name', label: 'Full name', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'password', label: 'Password (min 8 chars)', type: 'password' },
          ].map(({ key, label, type }) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{label}</label>
              <input type={type} value={form[key]} onChange={set(key)} required
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: '#15803d', color: 'white', padding: '0.625rem', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}>
            {loading ? 'Creating account...' : 'Start free trial'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', textAlign: 'center', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#15803d', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
