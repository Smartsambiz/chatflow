import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return ''
  if (mediaUrl.startsWith('data:') || mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl
  }
  return `${SOCKET_URL}${mediaUrl}`
}

function Inbox() {
  const [conversations, setConversations] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState('')
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [lastInboundId, setLastInboundId] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      fetchMessages(selectedCustomer._id)
    }
  }, [selectedCustomer])

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const socket = io(SOCKET_URL)

    socket.on('connect', () => {
      if (user?._id) {
        socket.emit('joinBusinessRoom', user._id)
      }
    })

    socket.on('new_message', (data) => {
      fetchConversations()

      const currentCustomerId = selectedCustomer?._id ? String(selectedCustomer._id) : null
      const incomingCustomerId = data?.customerId ? String(data.customerId) : null

      if (currentCustomerId && incomingCustomerId && currentCustomerId === incomingCustomerId) {
        fetchMessages(data.customerId)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [selectedCustomer])

  const fetchConversations = async () => {
    try {
      setError('')
      const response = await api.get('/conversations')
      setConversations(response.data?.customers || [])
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
      setConversations([])
      setError(err.response?.data?.message || 'Could not load customers. Please check your login session and server connection.')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (customerId) => {
    try {
      setMessagesLoading(true)
      setMessagesError('')
      const response = await api.get(`/conversations/${customerId}`)
      const msgs = response.data?.messages || []
      setMessages(msgs)

      const inboundMessages = msgs.filter((m) => m.direction === 'inbound')
      if (inboundMessages.length > 0) {
        const lastInbound = inboundMessages[inboundMessages.length - 1]
        setLastInboundId(lastInbound._id)
        setAiSuggestion(lastInbound.aiSuggestion || '')
      } else {
        setAiSuggestion('')
        setLastInboundId(null)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      setMessages([])
      setMessagesError(err.response?.data?.message || 'Could not load this customer conversation.')
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSend = async () => {
    if ((!replyText.trim() && !selectedImage) || !selectedCustomer) return
    setSending(true)

    const messageToSend = replyText.trim()
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      _id: tempId,
      businessId: selectedCustomer._id,
      customerId: selectedCustomer._id,
      direction: 'outbound',
      type: selectedImage ? 'image' : 'text',
      content: messageToSend,
      mediaUrl: selectedImagePreview,
      status: 'sent',
      timestamp: new Date().toISOString(),
    }

    setMessages((prevMessages) => [...prevMessages, optimisticMessage])
    setReplyText('')
    setSelectedImage(null)
    setSelectedImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      const response = selectedImage
        ? await api.post('/conversations/send-image', {
            customerId: selectedCustomer._id,
            imageDataUrl: selectedImagePreview,
            caption: messageToSend,
          })
        : await api.post('/conversations/send', {
            customerId: selectedCustomer._id,
            message: messageToSend,
          })

      if (response.data?.data) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg._id === tempId ? response.data.data : msg))
        )
      }

      await fetchMessages(selectedCustomer._id)
      await fetchConversations()
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== tempId))

      if (err.response?.data?.error === 'TOKEN_EXPIRED') {
        alert('Your WhatsApp access token has expired. Please go to Settings to update your access token.')
      } else {
        alert(err.response?.data?.message || 'Failed to send message. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please choose a JPG, PNG, or WebP image.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image under 5MB.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(file)
      setSelectedImagePreview(String(reader.result || ''))
    }
    reader.readAsDataURL(file)
  }

  const clearSelectedImage = () => {
    setSelectedImage(null)
    setSelectedImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRegenerateAi = async () => {
    if (!lastInboundId) return
    setLoadingAi(true)

    try {
      const response = await api.post('/conversations/ai-suggest', {
        messageId: lastInboundId,
      })
      setAiSuggestion(response.data.suggestion)
    } catch (err) {
      console.error('Failed to get AI suggestion:', err)
    } finally {
      setLoadingAi(false)
    }
  }

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return 'Invalid time'
      return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    } catch (error) {
      console.error('Error formatting time:', timestamp, error)
      return 'Invalid time'
    }
  }

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
    } catch (error) {
      console.error('Error formatting date:', timestamp, error)
      return 'Invalid date'
    }
  }

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden p-4 pb-28 sm:p-6 sm:pb-28 lg:h-screen lg:p-8">
      <div className="flex min-h-0 w-full overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white shadow-2xl shadow-slate-950/10">
        <aside className={`${selectedCustomer ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-emerald-950/10 bg-white md:w-80 lg:w-96`}>
          <div className="border-b border-emerald-950/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Inbox</p>
            <div className="mt-2 flex items-end justify-between">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Conversations</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {conversations.length}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-400">
                Loading conversations...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
                <p className="text-sm font-black text-rose-700">Customers unavailable</p>
                <p className="mt-2 text-xs leading-5 text-rose-600">{error}</p>
                <button
                  onClick={fetchConversations}
                  className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-700"
                >
                  Try again
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-lg font-black text-emerald-700">0</div>
                <p className="mt-4 text-sm font-bold text-slate-700">No conversations yet</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Messages will appear here when customers contact you on WhatsApp.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`flex w-full items-center gap-3 rounded-3xl p-4 text-left transition ${
                      selectedCustomer?._id === customer._id
                        ? 'bg-slate-950 text-white shadow-xl shadow-slate-950/10'
                        : 'text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black ${
                      selectedCustomer?._id === customer._id ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black">{customer.name}</p>
                        <p className={`shrink-0 text-xs ${selectedCustomer?._id === customer._id ? 'text-slate-300' : 'text-slate-400'}`}>
                          {formatDate(customer.lastMessageAt)}
                        </p>
                      </div>
                      <p className={`mt-1 truncate text-xs ${selectedCustomer?._id === customer._id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {customer.phone}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className={`${selectedCustomer ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#f6f8f3]`}>
          {selectedCustomer ? (
            <>
              <div className="flex items-center gap-3 border-b border-emerald-950/10 bg-white/90 px-4 py-5 backdrop-blur sm:px-6">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 md:hidden"
                >
                  Back
                </button>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 font-black text-emerald-700">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{selectedCustomer.name}</p>
                  <p className="truncate text-xs font-medium text-slate-500">{selectedCustomer.phone}</p>
                </div>
                <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold capitalize ${
                  selectedCustomer.status === 'lead'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {selectedCustomer.status}
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
                {messagesLoading ? (
                  <div className="rounded-3xl bg-white p-6 text-center text-sm font-medium text-slate-400">
                    Loading messages...
                  </div>
                ) : messagesError ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
                    <p className="text-sm font-black text-rose-700">Messages unavailable</p>
                    <p className="mt-2 text-xs leading-5 text-rose-600">{messagesError}</p>
                    <button
                      onClick={() => fetchMessages(selectedCustomer._id)}
                      className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-700"
                    >
                      Try again
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-3xl bg-white p-8 text-center">
                    <p className="text-sm font-black text-slate-700">No messages yet</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      This customer is in your list, but no chat history has been saved yet.
                    </p>
                  </div>
                ) : messages.map((message) => (
                  <div key={message._id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-3xl px-4 py-3 text-sm shadow-sm lg:max-w-md ${
                      message.direction === 'outbound'
                        ? 'rounded-br-md bg-emerald-600 text-white'
                        : 'rounded-bl-md border border-emerald-950/10 bg-white text-slate-800'
                    }`}>
                      {message.type === 'image' && message.mediaUrl ? (
                        <div className="space-y-2">
                          <img
                            src={getMediaUrl(message.mediaUrl)}
                            alt={message.content || 'Chat image'}
                            className="max-h-72 w-full rounded-2xl object-cover"
                          />
                          {message.content && <p className="leading-6">{message.content}</p>}
                        </div>
                      ) : (
                        <p className="leading-6">{message.content}</p>
                      )}
                      <p className={`mt-2 text-[11px] font-medium ${message.direction === 'outbound' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {aiSuggestion && (
                <div className="border-t border-cyan-200 bg-cyan-50/90 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="rounded-full bg-cyan-600 px-3 py-1 text-xs font-black text-white">AI suggestion</span>
                        <button
                          onClick={handleRegenerateAi}
                          disabled={loadingAi}
                          className="text-xs font-bold text-cyan-700 transition hover:text-cyan-900 disabled:opacity-50"
                        >
                          {loadingAi ? 'Thinking...' : 'Regenerate'}
                        </button>
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{aiSuggestion}</p>
                    </div>
                    <button
                      onClick={() => setReplyText(aiSuggestion)}
                      className="shrink-0 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-700"
                    >
                      Use this
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-emerald-950/10 bg-white p-4">
                {selectedImagePreview && (
                  <div className="mb-3 flex items-start gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-3">
                    <img
                      src={selectedImagePreview}
                      alt="Selected upload"
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-800">{selectedImage?.name}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Add an optional caption, then send.</p>
                    </div>
                    <button
                      onClick={clearSelectedImage}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="self-end rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Image
                  </button>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedImage ? 'Add a caption...' : 'Type a reply. Press Enter to send.'}
                    rows={2}
                    className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || (!replyText.trim() && !selectedImage)}
                    className="self-end rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-100 text-xl font-black text-emerald-700">CF</div>
                <p className="mt-5 text-lg font-black text-slate-900">Select a conversation</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Choose a customer from the list to open the thread and reply with confidence.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Inbox
