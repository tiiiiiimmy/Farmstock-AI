import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Pricing() {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const { token, trialDaysLeft, isTrialing } = useAuth()
  const navigate = useNavigate()

  const handleSubscribe = async (plan) => {
    if (!token) { navigate('/register'); return }
    setLoading(plan)
    setError('')
    try {
      const { checkout_url } = await api.createCheckoutSession(plan)
      window.location.href = checkout_url
    } catch (err) {
      setError(err.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  const plans = [
    { id: 'monthly', name: 'Monthly', price: '$49', period: '/month NZD',
      features: ['Unlimited predictions', 'AI chat (Claude)', 'Telegram alerts', 'Email orders', 'Spending analytics'] },
    { id: 'annual', name: 'Annual', price: '$490', period: '/year NZD', badge: 'Save $98',
      features: ['Everything in Monthly', '2 months free', 'Priority support'] },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', padding: '4rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: '#14532d', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Simple pricing</h1>
        {isTrialing && <p style={{ color: '#92400e', marginBottom: '2rem' }}>⏳ {trialDaysLeft} days left in your trial</p>}
        {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'left', position: 'relative' }}>
              {plan.badge && <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '20px' }}>{plan.badge}</span>}
              <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{plan.name}</h2>
              <div style={{ marginBottom: '1rem' }}><span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#15803d' }}>{plan.price}</span><span style={{ color: '#6b7280', fontSize: '0.875rem' }}>{plan.period}</span></div>
              <ul style={{ marginBottom: '1.5rem', paddingLeft: 0, listStyle: 'none' }}>
                {plan.features.map(f => <li key={f} style={{ fontSize: '0.875rem', color: '#374151', padding: '0.25rem 0' }}>✓ {f}</li>)}
              </ul>
              <button onClick={() => handleSubscribe(plan.id)} disabled={loading === plan.id}
                style={{ width: '100%', background: '#15803d', color: 'white', padding: '0.625rem', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: loading === plan.id ? 0.7 : 1 }}>
                {loading === plan.id ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
        {token && <p style={{ marginTop: '2rem', fontSize: '0.875rem' }}><Link to="/dashboard" style={{ color: '#15803d' }}>← Back to dashboard</Link></p>}
      </div>
    </div>
  )
}
