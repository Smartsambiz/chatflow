import { useState, useEffect } from 'react'
import api, { API_ORIGIN } from '../../services/api'

const emptyForm = {
  businessName: '',
  ownerName: '',
  phone: '',
  businessCategory: '',
  description: '',
  productsServices: '',
  productImageUrls: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  autoReplyEnabled: true,
  autoReplyDelaySeconds: 30,
  whatsappPhoneNumberId: '',
  whatsappAccessToken: '',
}

function Settings() {
  const [formData, setFormData] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [whatsappTokenConfigured, setWhatsappTokenConfigured] = useState(false)
  const [testingWhatsapp, setTestingWhatsapp] = useState(false)
  const [whatsappTest, setWhatsappTest] = useState(null)

  const webhookUrl = `${API_ORIGIN}/api/webhook`

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/auth/profile')
      const user = response.data.user || {}
      setWhatsappTokenConfigured(Boolean(user.whatsappAccessTokenConfigured))
      setFormData({
        ...emptyForm,
        businessName: user.businessName || '',
        ownerName: user.ownerName || '',
        phone: user.phone || '',
        businessCategory: user.businessCategory || '',
        description: user.description || '',
        productsServices: user.productsServices || '',
        productImageUrls: (user.productImageUrls || []).join('\n'),
        bankName: user.bankName || '',
        accountName: user.accountName || '',
        accountNumber: user.accountNumber || '',
        autoReplyEnabled: user.autoReplyEnabled ?? true,
        autoReplyDelaySeconds: user.autoReplyDelaySeconds || 30,
        whatsappPhoneNumberId: user.whatsappPhoneNumberId || '',
        whatsappAccessToken: '',
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
      const payload = {
        ...formData,
        autoReplyDelaySeconds: Number(formData.autoReplyDelaySeconds) || 30,
      }
      if (!payload.whatsappAccessToken.trim()) {
        delete payload.whatsappAccessToken
      }
      const response = await api.put('/auth/profile', payload)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      setWhatsappTokenConfigured(Boolean(response.data.user?.whatsappAccessTokenConfigured))
      setFormData((current) => ({ ...current, whatsappAccessToken: '' }))
      setWhatsappTest(null)
      setMessage('Settings saved successfully!')
    } catch (err) {
      console.error('Failed to save settings:', err)
      setMessage('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setMessage('Webhook URL copied.')
    } catch (err) {
      console.error('Failed to copy webhook URL:', err)
      setMessage('Could not copy automatically. Highlight the webhook URL and copy it manually.')
    }
  }

  const testWhatsappConnection = async () => {
    setTestingWhatsapp(true)
    setWhatsappTest(null)
    setMessage('')

    try {
      const payload = {
        whatsappPhoneNumberId: formData.whatsappPhoneNumberId,
      }

      if (formData.whatsappAccessToken.trim()) {
        payload.whatsappAccessToken = formData.whatsappAccessToken.trim()
      }

      const response = await api.post('/auth/whatsapp/test-connection', payload)
      setWhatsappTest(response.data)
    } catch (err) {
      setWhatsappTest({
        connected: false,
        message: err.response?.data?.message || 'Could not verify WhatsApp. Please try again.',
      })
    } finally {
      setTestingWhatsapp(false)
    }
  }

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
  const labelClass = 'mb-2 block text-sm font-bold text-slate-700'

  return (
    <main className="min-h-screen overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">
      <section className="max-w-6xl">
        <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Settings</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Business brain and WhatsApp setup</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Teach ChatFlow about your business so AI suggestions and delayed auto-replies sound useful, accurate, and on-brand.
          </p>
        </div>

        {message && (
          <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold ${
            message.includes('successfully')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            {message}
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Quick guide</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">How to use ChatFlow</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              Complete these settings once, then use Inbox daily to manage customers and replies.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                title: '1. Connect WhatsApp',
                body: 'Follow the guided connector below. ChatFlow checks the number and token before you start using Inbox.',
              },
              {
                title: '2. Teach the AI',
                body: 'Fill in your business description, products, services, image links, prices, delivery notes, and bank details.',
              },
              {
                title: '3. Work from Inbox',
                body: 'Open Inbox to see new customer messages live, use AI suggestions, reply manually, attach images, or let auto-reply handle delays.',
              },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-black text-slate-900">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-900">
            Product image links must be public HTTPS links if you want auto-replies to send them as WhatsApp image messages. For manual image replies, use the Image button inside Inbox.
          </div>
        </section>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-xl shadow-slate-950/5">
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
                <h2 className="text-lg font-black text-slate-950">Business profile</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Business Name</label>
                    <input name="businessName" value={formData.businessName} onChange={handleChange} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Owner Name</label>
                    <input name="ownerName" value={formData.ownerName} onChange={handleChange} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Business Category</label>
                    <input name="businessCategory" value={formData.businessCategory} onChange={handleChange} placeholder="Fashion, food, beauty, logistics..." className={inputClass} />
                  </div>
                </div>
                <div className="mt-4">
                  <label className={labelClass}>Business Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="What your business does, where you serve, and what customers usually ask." className={`${inputClass} resize-none`} />
                </div>
              </section>

              <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
                <h2 className="text-lg font-black text-slate-950">Auto-reply behavior</h2>
                <label className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                  <input
                    type="checkbox"
                    name="autoReplyEnabled"
                    checked={formData.autoReplyEnabled}
                    onChange={handleChange}
                    className="mt-1 h-5 w-5 rounded border-emerald-300 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-black text-slate-900">Send AI reply automatically</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      AI suggestions appear immediately. If no manual reply is sent, ChatFlow sends after the delay.
                    </span>
                  </span>
                </label>
                <div className="mt-4">
                  <label className={labelClass}>Delay before auto-send</label>
                  <input
                    type="number"
                    name="autoReplyDelaySeconds"
                    min="5"
                    max="300"
                    value={formData.autoReplyDelaySeconds}
                    onChange={handleChange}
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs font-medium text-slate-500">30 seconds is recommended.</p>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
                <h2 className="text-lg font-black text-slate-950">Products, services, and payment</h2>
                <div className="mt-5">
                  <label className={labelClass}>Products or Services</label>
                  <textarea name="productsServices" value={formData.productsServices} onChange={handleChange} rows={6} placeholder="List products, services, prices, sizes, delivery areas, booking rules, return policy, and anything customers ask often." className={`${inputClass} resize-none`} />
                </div>
                <div className="mt-4">
                  <label className={labelClass}>Product Image Links</label>
                  <textarea name="productImageUrls" value={formData.productImageUrls} onChange={handleChange} rows={4} placeholder="Paste one image URL per line." className={`${inputClass} resize-none`} />
                  <p className="mt-2 text-xs font-medium text-slate-500">The AI can share these links when customers ask to see products.</p>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <input name="bankName" value={formData.bankName} onChange={handleChange} placeholder="GTBank" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Account Name</label>
                    <input name="accountName" value={formData.accountName} onChange={handleChange} placeholder="Adaeze Boutique" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Account Number</label>
                    <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="0123456789" className={inputClass} />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Guided setup</p>
                    <h2 className="mt-2 text-lg font-black text-slate-950">Connect WhatsApp</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Complete these steps once. ChatFlow will check the connection before customers start messaging you.
                    </p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                    whatsappTokenConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {whatsappTokenConfigured ? 'Token saved' : 'Not connected'}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    'Open Meta for Developers and select your WhatsApp app.',
                    'Copy the Phone Number ID and generate an access token.',
                    'Paste both below, save settings, then run Test connection.',
                    'In Meta webhooks, use the callback URL below and subscribe to messages.',
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
                      <p className="text-sm leading-6 text-slate-700">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-4">
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Webhook callback URL</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={webhookUrl} readOnly className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
                    <button type="button" onClick={copyWebhookUrl} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700">
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-emerald-900">Use this in Meta webhook setup. The verify token is the value saved in Railway as WHATSAPP_VERIFY_TOKEN.</p>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className={labelClass}>Phone Number ID</label>
                    <input name="whatsappPhoneNumberId" value={formData.whatsappPhoneNumberId} onChange={handleChange} placeholder="Example: 123456789012345" className={inputClass} />
                    <p className="mt-2 text-xs font-medium text-slate-500">This is a long ID from Meta, not your visible WhatsApp phone number.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Access Token</label>
                    <textarea
                      name="whatsappAccessToken"
                      value={formData.whatsappAccessToken}
                      onChange={handleChange}
                      placeholder={whatsappTokenConfigured ? 'Token saved. Paste a new token only when replacing it.' : 'Paste the access token from Meta'}
                      rows={4}
                      className={`${inputClass} resize-none`}
                    />
                    {whatsappTokenConfigured && (
                      <p className="mt-2 text-xs font-bold text-emerald-700">Access token is saved and hidden for security.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={testWhatsappConnection}
                    disabled={testingWhatsapp || (!formData.whatsappAccessToken.trim() && !whatsappTokenConfigured)}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {testingWhatsapp ? 'Checking...' : 'Test connection'}
                  </button>
                  <p className="text-xs leading-5 text-slate-500 sm:max-w-sm">
                    Save after pasting a new token. Test connection can use a saved token or a new token typed above.
                  </p>
                </div>

                {whatsappTest && (
                  <div className={`mt-5 rounded-2xl border p-4 ${
                    whatsappTest.connected
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}>
                    <p className="text-sm font-black">{whatsappTest.connected ? 'Connection verified' : 'Connection needs attention'}</p>
                    <p className="mt-1 text-sm leading-6">{whatsappTest.message}</p>
                    {whatsappTest.phoneNumber && (
                      <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-2">
                        <p>Number: {whatsappTest.phoneNumber.displayPhoneNumber || 'Available'}</p>
                        <p>Name: {whatsappTest.phoneNumber.verifiedName || 'Not provided'}</p>
                        <p>Quality: {whatsappTest.phoneNumber.qualityRating || 'Unknown'}</p>
                        <p>Platform: {whatsappTest.phoneNumber.platformType || 'Unknown'}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}

export default Settings
