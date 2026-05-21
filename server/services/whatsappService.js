const axios = require('axios');

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

const sendImageMessage = async (phoneNumberId, accessToken, to, imageUrl, caption = '')=>{
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'image',
                image: {
                    link: imageUrl,
                    ...(caption ? { caption } : {}),
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
        console.error('Whatsapp image send error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

const uploadImageMedia = async (phoneNumberId, accessToken, imageBuffer, mimeType, filename = 'chat-image.jpg') => {
    try {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', mimeType);
        formData.append('file', new Blob([imageBuffer], { type: mimeType }), filename);

        const response = await fetch(
            `https://graph.facebook.com/v25.0/${phoneNumberId}/media`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            }
        );

        const data = await response.json();
        if (!response.ok) {
            const error = new Error('WhatsApp media upload failed');
            error.response = { data, status: response.status };
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Whatsapp media upload error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

const sendImageMediaMessage = async (phoneNumberId, accessToken, to, mediaId, caption = '') => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'image',
                image: {
                    id: mediaId,
                    ...(caption ? { caption } : {}),
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
        console.error('Whatsapp media image send error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    sendTextMessage,
    sendImageMessage,
    uploadImageMedia,
    sendImageMediaMessage,
}
