const axios = require('axios');
const { recompileSchema } = require('../models/User');

const sendTextMessage = async (phoneNumberId, accessToken, to, message)=>{
    try {

        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    preview_url: false,
                    body: message
                },
            }, 
            {   
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
        

    } catch (error) {
        console.error('Whatsapp send error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    sendTextMessage,
}