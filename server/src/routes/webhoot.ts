const express = require("express");
const router = express.Router();
const { verifyWebhook, receiveMessage} = require("../controllers/webhookController");

//Get - Meta uses this to verify the webhook
router.get('/', verifyWebhook);

// POST - Meta uses this
router.post('/', receiveMessage);

module.exports = router