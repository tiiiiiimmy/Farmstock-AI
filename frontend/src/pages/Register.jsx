import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const fields = [
  { key: 'full_name', label: 'Full name',              type: 'text',     placeholder: 'Jane Smith' },
  { key: 'email',     label: 'Email',                  type: 'email',    placeholder: 'you@farm.com' },
  { key: 'password',  label: 'Password (min 8 chars)', type: 'password', placeholder: '••••••••' },
]

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
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-logo" src="/logo.png" alt="FarmStock AI" />
        <h1 className="auth-title">Start free trial</h1>
        <p className="auth-subtitle">14 days free — no credit card required</p>

        {error && <p className="form-error-banner" style={{ marginBottom: '1rem' }}>{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key} className="field-group">
              <label className="field-label">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                required
              />
            </div>
          ))}

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? 'Creating account…' : 'Start free trial'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
