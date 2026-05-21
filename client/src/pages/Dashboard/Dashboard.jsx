import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [customers, setCustomers] = useState([])
  const [messagesByCustomer, setMessagesByCustomer] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/conversations')
      const fetchedCustomers = response.data?.customers || []
      setCustomers(fetchedCustomers)

      const messageEntries = await Promise.all(
        fetchedCustomers.map(async (customer) => {
          try {
            const messageResponse = await api.get(`/conversations/${customer._id}`)
            return [customer._id, messageResponse.data?.messages || []]
          } catch (err) {
            console.error(`Failed to fetch messages for ${customer._id}:`, err)
            return [customer._id, []]
          }
        })
      )

      setMessagesByCustomer(Object.fromEntries(messageEntries))
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError(err.response?.data?.message || 'Could not load dashboard data.')
      setCustomers([])
      setMessagesByCustomer({})
    } finally {
      setLoading(false)
    }
  }

  const dashboard = useMemo(() => {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const allMessages = Object.values(messagesByCustomer).flat()

    const messagesToday = allMessages.filter((message) => {
      const timestamp = new Date(message.timestamp)
      return !isNaN(timestamp.getTime()) && timestamp >= startOfToday
    }).length

    const activeLeads = customers.filter((customer) => customer.status === 'lead').length
    const activeCustomers = customers.filter((customer) => customer.status === 'active').length
    const newInquiries = customers.filter((customer) => {
      const timestamp = new Date(customer.lastMessageAt)
      return !isNaN(timestamp.getTime()) && timestamp >= startOfToday
    }).length

    const needsReply = customers.filter((customer) => {
      const messages = messagesByCustomer[customer._id] || []
      const lastMessage = messages[messages.length - 1]
      return lastMessage?.direction === 'inbound'
    }).length

    return {
      totalCustomers: customers.length,
      messagesToday,
      activeLeads,
      activeCustomers,
      newInquiries,
      needsReply,
    }
  }, [customers, messagesByCustomer])

  const metrics = [
    {
      label: 'Total customers',
      value: dashboard.totalCustomers,
      helper: loading ? 'Loading customers...' : 'Captured across WhatsApp',
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Messages today',
      value: dashboard.messagesToday,
      helper: loading ? 'Checking conversations...' : 'Inbound and outbound',
      accent: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Active leads',
      value: dashboard.activeLeads,
      helper: loading ? 'Reading lead status...' : 'Waiting for follow-up',
      accent: 'from-amber-400 to-orange-500',
    },
  ]

  const pipeline = [
    { label: 'New inquiries', value: dashboard.newInquiries, accent: metrics[0].accent },
    { label: 'Needs reply', value: dashboard.needsReply, accent: metrics[1].accent },
    { label: 'Active customers', value: dashboard.activeCustomers, accent: metrics[2].accent },
  ]

  const maxPipelineValue = Math.max(...pipeline.map((item) => item.value), 1)

  return (
    <main className="min-h-screen overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-8">
      <section className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/15 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 sm:text-sm sm:tracking-[0.2em]">
              Business command center
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Welcome back, {user.ownerName || 'there'}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              {user.businessName || 'Your business'} can manage leads, conversations, and customer follow-ups from one clean workspace.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Response health</p>
            <p className="mt-2 text-2xl font-black text-emerald-300 sm:text-3xl">
              {dashboard.needsReply > 0 ? `${dashboard.needsReply} waiting` : 'Ready'}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-black text-rose-700">Dashboard unavailable</p>
          <p className="mt-2 text-xs leading-5 text-rose-600">{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      )}

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
            <div className={`h-2 w-16 rounded-full bg-gradient-to-r ${metric.accent}`} />
            <p className="mt-5 text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              {loading ? '...' : metric.value}
            </p>
            <p className="mt-2 text-sm text-slate-500">{metric.helper}</p>
          </div>
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Customer pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">A live snapshot of customer momentum.</p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {loading ? 'Syncing' : 'Live'}
            </span>
          </div>
          <div className="mt-7 space-y-5">
            {pipeline.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-black text-slate-500">{loading ? '...' : item.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r ${item.accent}`}
                    style={{ width: loading ? '20%' : `${Math.max((item.value / maxPipelineValue) * 100, item.value > 0 ? 12 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-6">
          <h2 className="text-lg font-black text-slate-950">Next best actions</h2>
          <div className="mt-5 space-y-3">
            {[
              dashboard.needsReply > 0 ? `Reply to ${dashboard.needsReply} waiting customer${dashboard.needsReply === 1 ? '' : 's'}` : 'Keep your response queue clear',
              dashboard.totalCustomers === 0 ? 'Wait for your first WhatsApp message' : 'Review your newest customer conversations',
              user.whatsappPhoneNumberId ? 'WhatsApp is connected' : 'Connect WhatsApp credentials',
            ].map((action) => (
              <div key={action} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-5 text-slate-700">
                {action}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Dashboard
