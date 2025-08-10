import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const API = import.meta.env.VITE_API_BASE

export default function PaymentForm({ amount, bookingId, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()

  const [clientSecret, setClientSecret] = useState('')
  const [intentId, setIntentId] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Create PaymentIntent for the deposit
    axios.post(`${API}/api/payments/create-payment-intent`, {
      amount_deposit: amount,
      customer_email: email || undefined,
      metadata: { booking_id: bookingId }
    }).then(res => {
      setClientSecret(res.data.client_secret)
      setIntentId(res.data.payment_intent_id)
    }).catch(err => {
      alert(err?.response?.data?.error || 'Stripe error')
    })
  }, [amount, bookingId])

  const pay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href
      },
      redirect: 'if_required'
    })

    if (error) {
      alert(error.message)
      return
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing' || paymentIntent.status === 'requires_capture')) {
      // finalize booking
      await axios.post(`${API}/api/bookings/finalize`, {
        booking_id: bookingId,
        payment_intent_id: intentId
      })
      onSuccess()
    } else {
      alert('Payment not completed yet. Status: ' + paymentIntent?.status)
    }
  }

  return (
    <form className="space-y-4" onSubmit={pay}>
      <h2 className="text-xl font-semibold">Pay 50% deposit</h2>
      <p className="text-sm text-gray-600">Deposit amount: {(amount/100).toFixed(2)}</p>

      {clientSecret ? (
        <>
          <PaymentElement />
          <button className="btn" disabled={!stripe}>Pay deposit</button>
        </>
      ) : (
        <p>Loading payment...</p>
      )}
    </form>
  )
}
