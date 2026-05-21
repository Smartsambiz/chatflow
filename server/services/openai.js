const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getGeminiClient = () => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }
  return new GoogleGenerativeAI(geminiKey);
};

const getModelCandidates = () => {
  const configuredModels = process.env.GEMINI_MODELS || process.env.GEMINI_MODEL;
  const models = configuredModels
    ? configuredModels.split(',').map((model) => model.trim()).filter(Boolean)
    : DEFAULT_MODELS;

  return [...new Set(models)];
};

const isRetryableGeminiError = (error) => {
  const message = String(error.message || '');
  const status = error.status || error.response?.status;

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes('[429') ||
    message.includes('[500') ||
    message.includes('[502') ||
    message.includes('[503') ||
    message.includes('[504') ||
    message.toLowerCase().includes('high demand') ||
    message.toLowerCase().includes('service unavailable')
  );
};

const isQuotaLimitError = (error) => {
  const message = String(error.message || '').toLowerCase();
  const status = error.status || error.response?.status;

  return (
    status === 429 ||
    message.includes('[429') ||
    message.includes('quota exceeded') ||
    message.includes('too many requests') ||
    message.includes('check your plan and billing')
  );
};

const buildFallbackReply = (customerMessage, businessContext) => {
  const message = String(customerMessage || '').toLowerCase();
  const productsServices = String(businessContext.productsServices || '').trim();
  const imageUrls = businessContext.productImageUrls || [];
  const hasBankDetails = businessContext.bankName && businessContext.accountName && businessContext.accountNumber;

  if (message.includes('account') || message.includes('bank') || message.includes('pay') || message.includes('payment')) {
    if (hasBankDetails) {
      return `You can make payment to ${businessContext.bankName}, ${businessContext.accountName}, ${businessContext.accountNumber}. Please send your payment receipt after transfer so we can confirm it.`;
    }

    return 'Thanks for asking. I will confirm the payment details and send them to you shortly. What would you like to order?';
  }

  if (
    message.includes('available') ||
    message.includes('buy') ||
    message.includes('catalog') ||
    message.includes('catalogue') ||
    message.includes('gadget') ||
    message.includes('gadgets') ||
    message.includes('have') ||
    message.includes('order') ||
    message.includes('product') ||
    message.includes('products') ||
    message.includes('services') ||
    message.includes('show me') ||
    message.includes('stock') ||
    message.includes('what do you have') ||
    message.includes('what you have')
  ) {
    if (productsServices) {
      const imageText = imageUrls.length ? ' I will send some product images too.' : '';
      return `Here are some of what we offer: ${productsServices}${imageText} Which one would you like more details about?`;
    }

    return 'We have different options available. Please tell me what you are looking for so I can guide you properly.';
  }

  if (message.includes('price') || message.includes('cost') || message.includes('how much')) {
    return productsServices
      ? `Thanks for asking. Here are the details we have: ${productsServices} Which item should I confirm the price for?`
      : 'Thanks for asking. I will check the current price and availability for you. Which exact item are you interested in?';
  }

  return `Thanks for your message. ${businessContext.businessName || 'We'} will attend to you shortly. Please share what you need so we can help you faster.`;
};

const buildPrompt = (customerMessage, businessContext) => `You are a helpful customer service assistant for a Nigerian small business.

Business name: ${businessContext.businessName}
Business category: ${businessContext.businessCategory || 'general'}
Business description: ${businessContext.description || 'A small business'}
Products and services: ${businessContext.productsServices || 'Not provided'}
Product image links: ${(businessContext.productImageUrls || []).join(', ') || 'Not provided'}
Bank name: ${businessContext.bankName || 'Not provided'}
Account name: ${businessContext.accountName || 'Not provided'}
Account number: ${businessContext.accountNumber || 'Not provided'}

Your job is to suggest a short, friendly reply to a customer's WhatsApp message.

Rules:
- Keep replies short (2-4 sentences max)
- Be warm and professional
- Write in Nigerian English - natural and friendly
- Never make up prices or specific product details you don't know
- Use the provided product, service, image link, and bank details only when they directly answer the customer
- If asked about price or availability, say you will check and confirm
- If bank details are requested and they are provided, include them clearly
- End with a question to keep the conversation going
- Do not use formal greetings like "Dear Customer"
- Do not start every response with a greeting or opener like "Hi!", "Hello!" or "Sure!"
- Write the reply as a natural continuation of the conversation

Customer message: "${customerMessage}"

Suggest a reply for the business owner to send:`;

const generateReply = async (customerMessage, businessContext) => {
  const prompt = buildPrompt(customerMessage, businessContext);
  const modelCandidates = getModelCandidates();
  let client;

  try {
    client = getGeminiClient();
  } catch (error) {
    console.error('Gemini setup error:', error.message);
    return buildFallbackReply(customerMessage, businessContext);
  }

  for (const modelName of modelCandidates) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.log(`Calling Gemini model ${modelName} with message:`, customerMessage);

        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const suggestion = result.response.text().trim();

        console.log(`AI suggestion generated with ${modelName}:`, suggestion);
        return suggestion;
      } catch (error) {
        const errorDetails = error.response?.data || error.message;
        console.error(`Gemini error on ${modelName} attempt ${attempt}:`, errorDetails);

        if (isQuotaLimitError(error)) {
          console.error('Gemini quota is exhausted. Using local fallback reply until billing/quota is fixed.');
          return buildFallbackReply(customerMessage, businessContext);
        }

        if (!isRetryableGeminiError(error)) {
          break;
        }

        if (attempt === 1) {
          await sleep(1200);
        }
      }
    }
  }

  return buildFallbackReply(customerMessage, businessContext);
};

module.exports = { generateReply };
