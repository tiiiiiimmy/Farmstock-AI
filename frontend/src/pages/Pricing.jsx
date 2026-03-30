import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatDaysLabel } from '../utils/formatters'

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$49',
    period: '/month NZD',
    features: ['Unlimited predictions', 'AI chat (Claude)', 'Telegram alerts', 'Email orders', 'Spending analytics'],
  },
  {
    id: 'annual',
    name: 'Annual',
    price: '$490',
    period: '/year NZD',
    badge: 'Save $98',
    features: ['Everything in Monthly', '2 months free', 'Priority support'],
  },
]

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

  return (
    <div className="pricing-page">
      <div className="pricing-container">

        <div className="pricing-header">
          <h1 className="pricing-title">Simple pricing</h1>
          <p className="pricing-subtitle">Everything you need to manage your farm supply intelligently.</p>
          {isTrialing && (
            <div className="pricing-trial-badge">
              {formatDaysLabel(trialDaysLeft)} left in your free trial
            </div>
          )}
          {error && <p className="pricing-error">{error}</p>}
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`pricing-card ${plan.badge ? 'pricing-card-featured' : ''}`}>
              {plan.badge && <span className="pricing-badge">{plan.badge}</span>}

              <div className="pricing-card-header">
                <p className="pricing-plan-name">{plan.name}</p>
                <div className="pricing-price-row">
                  <span className="pricing-price">{plan.price}</span>
                  <span className="pricing-period">{plan.period}</span>
                </div>
              </div>

              <ul className="pricing-features">
                {plan.features.map((f) => (
                  <li key={f} className="pricing-feature">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pricing-check-icon">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`${plan.badge ? '' : 'secondary-button'} pricing-submit`}
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? 'Loading…' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        {token && (
          <p className="pricing-back">
            <Link to="/dashboard" className="auth-link">← Back to dashboard</Link>
          </p>
        )}
      </div>
    </div>
  )
}
