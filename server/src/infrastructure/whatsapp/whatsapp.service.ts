const axios = require('axios');

type WhatsAppError = Error & { response?: { data?: unknown; status?: number } };

const getPhoneNumberInfo = async (phoneNumberId: string, accessToken: string) => {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/v25.0/${phoneNumberId}`,
            {
                params: {
                    fields: 'display_phone_number,verified_name,quality_rating,platform_type',
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        return response.data;
    } catch (error: unknown) {
        const whatsappError = error as WhatsAppError;
        console.error('Whatsapp phone number lookup error:', whatsappError.response ? whatsappError.response.data : whatsappError.message);
        throw error;
    }
}

const sendTextMessage = async (phoneNumberId: string, accessToken: string, to: string, message: string)=>{
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
        

    } catch (error: unknown) {
        const whatsappError = error as WhatsAppError;
        console.error('Whatsapp send error:', whatsappError.response ? whatsappError.response.data : whatsappError.message);
        throw error;
    }
}

const sendImageMessage = async (phoneNumberId: string, accessToken: string, to: string, imageUrl: string, caption = '')=>{
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
    } catch (error: unknown) {
        const whatsappError = error as WhatsAppError;
        console.error('Whatsapp image send error:', whatsappError.response ? whatsappError.response.data : whatsappError.message);
        throw error;
    }
}

const uploadImageMedia = async (phoneNumberId: string, accessToken: string, imageBuffer: Buffer, mimeType: string, filename = 'chat-image.jpg') => {
    try {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', mimeType);
        const imageBytes = Array.from(imageBuffer.values());
        formData.append('file', new Blob([new Uint8Array(imageBytes)], { type: mimeType }), filename);

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
            const error = new Error('WhatsApp media upload failed') as WhatsAppError;
            error.response = { data, status: response.status };
            throw error;
        }

        return data;
    } catch (error: unknown) {
        const whatsappError = error as WhatsAppError;
        console.error('Whatsapp media upload error:', whatsappError.response ? whatsappError.response.data : whatsappError.message);
        throw error;
    }
}

const sendImageMediaMessage = async (phoneNumberId: string, accessToken: string, to: string, mediaId: string, caption = '') => {
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
    } catch (error: unknown) {
        const whatsappError = error as WhatsAppError;
        console.error('Whatsapp media image send error:', whatsappError.response ? whatsappError.response.data : whatsappError.message);
        throw error;
    }
}

module.exports = {
    getPhoneNumberInfo,
    sendTextMessage,
    sendImageMessage,
    uploadImageMedia,
    sendImageMediaMessage,
}
