const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const getGeminiClient = () => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }
  return new GoogleGenerativeAI(geminiKey);
};

const generateReply = async(customerMessage, businessContext)=>{
    try{
        console.log('Calling Gemini with message: ', customerMessage);

        const model = getGeminiClient().getGenerativeModel({ model: 'gemini-3-flash-preview'});

        const prompt = `You are a helpful customer service assistant for a Nigerian small business.

            Business name: ${businessContext.businessName}
            Business category: ${businessContext.businessCategory || 'general'}
            Business description: ${businessContext.description || 'A small business'}

            Your job is to suggest a short, friendly reply to a customer's WhatsApp message.

            Rules: 
            - Keep replies short (2-4 sentences max)
            - Be warm and professional
            - Write in Nigerian English - natural and friendly
            - Never make up prices or specific product details you don't know
            - If asked about price or availability, say you will check and confirm
            - End with a question to keep the conversation going
            - Do not use formal greetings like "Dear Customer"
            - Do not start every response with a greeting or opener like "Hi!", "Hello!" or "Sure!"
            - Write the reply as a natural continuation of the conversation

            Customer message: "${customerMessage}"

            Suggest a reply for the business owner to send:
        `;

        const result = await model.generateContent(prompt);
        const suggestion = result.response.text().trim();

        console.log('AI suggestion generated:',suggestion);
        return suggestion;

    } catch(error){
        console.error('Gemini error:' , error.response?.data || error.message);
        return null;
    }
};

module.exports = { generateReply };