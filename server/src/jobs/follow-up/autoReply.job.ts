const Message = require('../models/Message');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { sendTextMessage, sendImageMessage } = require('../../infrastructure/whatsapp/whatsapp.service');

const pendingReplies = new Map();

const getPendingKey = (businessId: string, customerId: string) => `${businessId}:${customerId}`;

const cancelAutoReply = (businessId: string, customerId: string) => {
  const key = getPendingKey(businessId, customerId);
  const pending = pendingReplies.get(key);

  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingReplies.delete(key);
    console.log('Cancelled pending auto-reply:', key);
  }
};

const shouldSendProductImages = (messageContent: unknown) => {
  const message = String(messageContent || '').toLowerCase();

  return (
    message.includes('available') ||
    message.includes('buy') ||
    message.includes('catalog') ||
    message.includes('catalogue') ||
    message.includes('gadget') ||
    message.includes('gadgets') ||
    message.includes('have') ||
    message.includes('image') ||
    message.includes('images') ||
    message.includes('order') ||
    message.includes('picture') ||
    message.includes('pictures') ||
    message.includes('photo') ||
    message.includes('photos') ||
    message.includes('price') ||
    message.includes('product') ||
    message.includes('products') ||
    message.includes('show me') ||
    message.includes('stock') ||
    message.includes('what do you have') ||
    message.includes('what you have')
  );
};

const getPublicProductImageUrls = (business: any) => (
  (business.productImageUrls || [])
    .map((url: unknown) => String(url).trim())
    .filter(Boolean)
);

const scheduleAutoReply = ({ businessId, customerId, inboundMessageId, suggestion, delaySeconds = 30, io }: { businessId: string; customerId: string; inboundMessageId: string; suggestion: string; delaySeconds?: number; io?: any }) => {
  if (!suggestion) return;

  const key = getPendingKey(businessId, customerId);
  cancelAutoReply(businessId, customerId);
  const delayMs = Math.min(Math.max(Number(delaySeconds) || 30, 5), 300) * 1000;

  const timeoutId = setTimeout(async () => {
    pendingReplies.delete(key);

    try {
      const [business, customer, inboundMessage] = await Promise.all([
        User.findById(businessId),
        Customer.findById(customerId),
        Message.findById(inboundMessageId),
      ]);

      if (!business || !customer || !inboundMessage) return;
      if (!business.autoReplyEnabled) return;
      if (!business.whatsappPhoneNumberId || !business.whatsappAccessToken) return;

      const manualReply = await Message.findOne({
        businessId,
        customerId,
        direction: 'outbound',
        timestamp: { $gt: inboundMessage.timestamp },
      });

      if (manualReply) {
        console.log('Auto-reply skipped because business already replied:', key);
        return;
      }

      await sendTextMessage(
        business.whatsappPhoneNumberId,
        business.whatsappAccessToken,
        customer.phone,
        suggestion
      );

      const savedMessage = await Message.create({
        businessId,
        customerId,
        direction: 'outbound',
        type: 'text',
        content: suggestion,
        status: 'sent',
        timestamp: new Date(),
      });

      const productImageUrls = getPublicProductImageUrls(business);
      const validWhatsappImageUrls = productImageUrls.filter((url: string) => url.startsWith('https://'));
      const wantsProductImages = shouldSendProductImages(inboundMessage.content);

      if (wantsProductImages && productImageUrls.length === 0) {
        console.log('No product image URLs saved for business:', String(businessId));
      }

      if (wantsProductImages && productImageUrls.length > 0 && validWhatsappImageUrls.length === 0) {
        console.log('Product images skipped because WhatsApp requires public https image URLs:', productImageUrls);
      }

      if (wantsProductImages && validWhatsappImageUrls.length > 0) {
        console.log('Sending product images to customer:', validWhatsappImageUrls.slice(0, 3));

        for (const [index, imageUrl] of validWhatsappImageUrls.slice(0, 3).entries()) {
          const caption = index === 0 ? 'Here are some product images.' : '';

          await sendImageMessage(
            business.whatsappPhoneNumberId,
            business.whatsappAccessToken,
            customer.phone,
            imageUrl,
            caption
          );

          const savedImageMessage = await Message.create({
            businessId,
            customerId,
            direction: 'outbound',
            type: 'image',
            content: caption,
            mediaUrl: imageUrl,
            status: 'sent',
            timestamp: new Date(),
          });

          if (io) {
            io.to(String(businessId)).emit('new_message', {
              customerId,
              customerName: customer.name,
              message: caption,
              timestamp: savedImageMessage.timestamp,
              messageDoc: savedImageMessage,
            });
          }
        }
      }

      if (io) {
        io.to(String(businessId)).emit('new_message', {
          customerId,
          customerName: customer.name,
          message: savedMessage.content,
          timestamp: savedMessage.timestamp,
          messageDoc: savedMessage,
        });
      }

      console.log('Delayed auto-reply sent:', key);
    } catch (error: unknown) {
      const autoReplyError = error as any;
      console.error('Delayed auto-reply error:', autoReplyError.response?.data || autoReplyError.message);
    }
  }, delayMs);

  pendingReplies.set(key, { timeoutId, inboundMessageId });
  console.log('Scheduled auto-reply:', key);
};

module.exports = { scheduleAutoReply, cancelAutoReply };
