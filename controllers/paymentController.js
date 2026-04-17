const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create payment intent
// @route   POST /api/payments/create-payment-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Amount in cents (2500 = $25.00)
            currency: currency || 'usd',
            metadata: {
                userId: req.user.id,
                integration_check: 'accept_a_payment'
            }
        });
        
        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get payment status
// @route   GET /api/payments/status/:paymentIntentId
// @access  Private
const getPaymentStatus = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;
        
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        res.status(200).json({
            success: true,
            status: paymentIntent.status,
            paymentIntent: paymentIntent
        });
        
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Stripe webhook
// @route   POST /api/payments/webhook
// @access  Public
const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful!', paymentIntent.id);
            // Update your database here
            break;
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
};

module.exports = {
    createPaymentIntent,
    getPaymentStatus,
    stripeWebhook
};