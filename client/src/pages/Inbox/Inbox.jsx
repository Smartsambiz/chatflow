import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { io } from 'socket.io-client'

function Inbox() {
  const [conversations, setConversations] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [lastInboundId, setLastInboundId] = useState(null)
  const [loadingAi, setLoadingAi ]= useState(false)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load all conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [])

  // Load messages when a customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      fetchMessages(selectedCustomer._id)
    }
  }, [selectedCustomer])

  useEffect(()=>{
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const socket = io('http://localhost:5000')

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      console.log('Socket joining room with business id:', user._id)
      if (user?._id) {
        socket.emit('joinBusinessRoom', user._id)
      } else {
        console.warn('No business ID found in localStorage user')
      }
    })

    socket.on('new_message', (data)=>{
      console.log('Socket new_message received:', data)
      fetchConversations()

      const currentCustomerId = selectedCustomer?._id ? String(selectedCustomer._id) : null
      const incomingCustomerId = data?.customerId ? String(data.customerId) : null

      console.log('Socket compare debug:', {
        selectedCustomer,
        currentCustomerId,
        incomingCustomerId,
      })

      if (currentCustomerId && incomingCustomerId && currentCustomerId === incomingCustomerId) {
        fetchMessages(data.customerId)
      }
    })

    return ()=>{
      socket.disconnect()
    }
  }, [selectedCustomer])

  const fetchConversations = async () => {
    try {
      const response = await api.get('/conversations')
      console.log('Conversations response:', response)
      setConversations(response.data.customers || response.customers || [])
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  // Updated fetchMessages to use aiSuggestions

  const fetchMessages = async (customerId) => {
    try {
      const response = await api.get(`/conversations/${customerId}`)
      const msgs = response.data.messages
      console.log('Messages response:', response.data.messages)
      setMessages(msgs)

      // Find the last inbound message and show
      const inboundMessages = msgs.filter(m=> m.direction ==='inbound')
      if(inboundMessages.length > 0){
        const lastInbound = inboundMessages[inboundMessages.length -1]
        setLastInboundId(lastInbound._id)
        setAiSuggestion(lastInbound.aiSuggestion || '')
      }else{
        setAiSuggestion('')
        setLastInboundId(null)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      setMessages([])
    }
  }

  const handleSend = async () => {
    if (!replyText.trim() || !selectedCustomer) return
    setSending(true)

    const messageToSend = replyText.trim()
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      _id: tempId,
      businessId: selectedCustomer._id,
      customerId: selectedCustomer._id,
      direction: 'outbound',
      type: 'text',
      content: messageToSend,
      status: 'sent',
      timestamp: new Date().toISOString(),
    }

    console.log('Sending message:', messageToSend, 'to', selectedCustomer._id)
    setMessages((prevMessages) => [...prevMessages, optimisticMessage])
    setReplyText('')

    try {
      const response = await api.post('/conversations/send', {
        customerId: selectedCustomer._id,
        message: messageToSend,
      })
      console.log('Send response:', response.data)

      if (response.data?.data) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === tempId ? response.data.data : msg
          )
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
        alert('Failed to send message. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  // Allow sending with Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRegenerateAi = async ()=>{
    if(!lastInboundId) return
    setLoadingAi(true)

    try {
      const response = await api.post('/conversations/ai-suggest',{
        messageId: lastInboundId,
      })
      setAiSuggestion(response.data.suggestion)
    } catch(err){
      console.error('Failed to get AI suggestion:', err)
    } finally{
      setLoadingAi(false)
    }
    }

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return 'Invalid time'
      }
      return date.toLocaleTimeString('en-NG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      console.error('Error formatting time:', timestamp, error)
      return 'Invalid time'
    }
  }

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return 'Invalid date'
      }
      return date.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
      })
    } catch (error) {
      console.error('Error formatting date:', timestamp, error)
      return 'Invalid date'
    }
  }

  

  return (
    <div className="flex h-full">

      {/* Left panel — conversation list */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Inbox</h2>
          <p className="text-xs text-gray-500 mt-1">
            {conversations.length} conversations
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Messages will appear here when customers WhatsApp you
              </p>
            </div>
          ) : (
            conversations.map((customer) => (
              <div
                key={customer._id}
                onClick={() => setSelectedCustomer(customer)}
                className={`flex items-center gap-3 p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedCustomer?._id === customer._id ? 'bg-green-50' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatDate(customer.lastMessageAt)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {customer.phone}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel — chat window */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedCustomer ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-800">{selectedCustomer.name}</p>
                <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
              </div>
              <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                selectedCustomer.status === 'lead'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {selectedCustomer.status}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                      message.direction === 'outbound'
                        ? 'bg-green-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.direction === 'outbound'
                        ? 'text-green-200'
                        : 'text-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestion Bar */}
            {aiSuggestion && (
              <div className='bg-blue-50 border-t border-blue-100 px-4 py-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex-1'>
                    <div className='fflex items-center gap-2 mb-1'>
                      <span className='text-xs font-semibold text-blue-600'
                      >Ai Suggestion</span>
                      <button
                        onClick={handleRegenerateAi}
                        disabled={loadingAi}
                        className='text-xs text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50'
                      >
                        {loadingAi ? 'Thinking...': 'Regenerate'}
                      </button>
                    </div>
                    <p className='text-sm text-gray-700 leading-relaxed'>
                      {aiSuggestion}
                    </p>
                  </div>
                  <button
                    onClick={()=> setReplyText(aiSuggestion)}
                    className='flex-shrink-0 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colorss'
                  >
                    Use this
                  </button>
                </div>
              </div>
            )}

            {/* Reply Box */}
            <div className="bg-white border-t border-gray-200 p-4 flex gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a reply... (Enter to send)"
                rows={2}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={sending || !replyText.trim()}
                className="bg-green-600 text-white px-6 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          // No conversation selected yet
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl mb-4">💬</p>
              <p className="text-gray-500 font-medium">Select a conversation</p>
              <p className="text-gray-400 text-sm mt-1">
                Choose a customer from the left to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default Inbox