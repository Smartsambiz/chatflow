import { useState, useEffect } from 'react'
import api from '../../services/api'

function Settings() {
  const [formData, setFormData] = useState({
    whatsappPhoneNumberId: '',
    whatsappAccessToken: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/auth/profile')
      setFormData({
        whatsappPhoneNumberId: response.data.user.whatsappPhoneNumberId || '',
        whatsappAccessToken: response.data.user.whatsappAccessToken || ''
      })
    } catch (err) {
      console.error('Failed to fetch settings:', err)
      setMessage('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await api.put('/auth/profile', formData)
      setMessage('Settings saved successfully!')
    } catch (err) {
      console.error('Failed to save settings:', err)
      setMessage('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('successfully')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">WhatsApp Configuration</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure your WhatsApp Business API credentials to send and receive messages.
          Access tokens expire after 24 hours for testing - you'll need to generate a new one when that happens.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How to get your credentials:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Facebook Developers</a></li>
            <li>Navigate to your WhatsApp Business API app</li>
            <li>Go to WhatsApp API Setup</li>
            <li>Copy your Phone Number ID and generate a new Access Token</li>
          </ol>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number ID
              </label>
              <input
                type="text"
                name="whatsappPhoneNumberId"
                value={formData.whatsappPhoneNumberId}
                onChange={handleChange}
                placeholder="Enter your WhatsApp Phone Number ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your WhatsApp Business API dashboard
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <textarea
                name="whatsappAccessToken"
                value={formData.whatsappAccessToken}
                onChange={handleChange}
                placeholder="Enter your WhatsApp Access Token"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Your permanent access token from WhatsApp Business API
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Settings