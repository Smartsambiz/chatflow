const User = require('../models/User');
const Customer = require('../models/Customer');
const Message = require('../models/Message');
const { sendTextMessage } = require('../services/whatsappService');
const { generateReply } = require('../services/openai');


// === verify webhook ===//
// Meta calls this once when you register the webhook URL.
// to confirm that you own the URL and to check if the webhook is working.

const verifyWebhook = (req, res)=>{
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if(mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN){
        console.log('Webhook verified');
        res.status(200).send(challenge);
    } else {
        console.log('Webhook verification failed');
        res.status(403).json({ message: 'Forbidden' });
    }
};

// === handle incoming messages ===//
// Meta calls this every time a customer sents a message.
const receiveMessage = async (req, res)=>{
    try {
        const body = req.body;

        //Meta sends a specific structure, we check it's a whatsapp message.
        if(body.object !== 'whatsapp_business_account' || !body.entry || !body.entry[0].changes || !body.entry[0].changes[0].value.messages){
            return res.sendStatus(200);
        }

        const value = body.entry[0].changes[0].value;
        const messageData = value.messages[0];
        const contactData = value.contacts?.[0];

        //Extract the important data from the message.
        const phoneNumberId = value.metadata.phone_number_id;
        const customerPhone = messageData.from;
        const messageText = messageData.text?.body || '';
        const waMessageId = messageData.id;
        const customerName = contactData?.profile?.name || 'Unknown';

        console.log('Received message:', { customerPhone, messageText });

        //Find which business owns this whatsapp number.
        const business = await User.findOne({ whatsappPhoneNumberId: phoneNumberId });

        if(!business){
            console.log('No business found for phone number ID:', phoneNumberId);
            return res.sendStatus(200);
        }

        //find or create the customer in our database.
        let customer = await Customer.findOne({ businessId: business._id, phone: customerPhone });

        if(!customer){
            customer = await Customer.create({
                businessId: business._id,
                name: customerName,
                phone: customerPhone,
                status: 'lead'
            });
        }else {
            customer.lastMessageAt = new Date();
            if(customerName !== 'Unknown'){
                customer.name = customerName;
            }
            await customer.save();

        }

        // Generate AI Suggestion before saving
        console.log('Generating AI suggestion...');
        const aiSuggestion = await generateReply(messageText, {
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            description: business.description
        });

        if(aiSuggestion){
            console.log(`AI suggestion ready`);
        }

        // save the message to the database
        await Message.create({
            businessId: business._id,
            customerId: customer._id,
            waMessageId,
            direction: 'inbound',
            type: 'text',
            content: messageText,
            aiSuggestions: aiSuggestion || '',
            timestamp: new Date(),
        });

        console.log('Message saved to database for customer:', customer.phone);

        // Auto-reply with AI suggestion
        if(aiSuggestion){
            try{
                await sendTextMessage(
                    business.whatsappPhoneNumberId,
                    business.whatsappAccessToken,
                    customerPhone,
                    aiSuggestion
                );

                await Message.create({
                    businessId: business._id,
                    customerId: customer._id,
                    direction: 'outbound',
                    type: 'text',
                    content: aiSuggestion,
                    status: 'sent',
                    timestamp: new Date(),
                })
                console.log('Auto-reply sent to customer:', customer.phone);
            } catch (autoReplyError){
                console.error('Error sending auto-reply:', autoReplyError);
            }
        }

        //Always respond with 200 to Meta,
        // if you don't, Meta will keep retrying.
        const io = req.app.get('io');
        if(io){
            console.log('Emitting new_message to room:', business._id.toString(), {
              customerId: customer._id,
              customerName: customer.name,
              message: messageText,
            })
            io.to(business._id.toString()).emit('new_message', {
                customerId: customer._id,
                customerName: customer.name,
                message: messageText,
                timestamp: new Date(),
            });
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error receiving message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { verifyWebhook, receiveMessage};