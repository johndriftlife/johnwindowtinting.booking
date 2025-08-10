import express from 'express'
import { Router } from 'express'
import Stripe from 'stripe'
import { CURRENCY } from '../config/businessHours.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount_deposit, amount_total, customer_email, metadata } = req.body
    if (!amount_deposit || !amount_total) return res.status(400).json({ error: 'Missing amounts' })
    const intent = await stripe.paymentIntents.create({
      amount: amount_deposit,
      currency: CURRENCY,
      receipt_email: customer_email,
      automatic_payment_methods: { enabled: true },
      description: `Booking deposit: €${(amount_deposit/100).toFixed(2)} of total €${(amount_total/100).toFixed(2)}`,
      metadata: metadata || {},
    })
    res.json({ client_secret: intent.client_secret, payment_intent_id: intent.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Stripe error', details: err.message })
  }
})

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!endpointSecret) return res.status(400).send('Webhook not configured')
  const sig = req.headers['stripe-signature']
  let event
  try {
    const s = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })
    event = s.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  res.json({ received: true })
})

export default router
