import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
const API = import.meta.env.VITE_API_BASE

export default function PaymentForm({ amount, total, bookingId, customerEmail, onSuccess }){
  const stripe = useStripe(), elements = useElements()
  const [clientSecret, setClientSecret] = useState('')
  const [intentId, setIntentId] = useState('')
  useEffect(()=>{
    axios.post(`${API}/api/payments/create-payment-intent`, {
      amount_deposit: amount, amount_total: total, customer_email: customerEmail, metadata: { booking_id: bookingId }
    }).then(r=>{ setClientSecret(r.data.client_secret); setIntentId(r.data.payment_intent_id) })
     .catch(err=> alert(err?.response?.data?.error || 'Stripe error'))
  }, [amount, total, bookingId, customerEmail])
  const pay = async (e)=>{
    e.preventDefault()
    if (!stripe || !elements) return
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.href }, redirect: 'if_required' })
    if (error) return alert(error.message)
    if (paymentIntent && ['succeeded','processing','requires_capture'].includes(paymentIntent.status)){
      await axios.post(`${API}/api/bookings/finalize`, { booking_id: bookingId, payment_intent_id: intentId })
      onSuccess(); window.scrollTo({ top: 0, behavior: 'smooth' })
    } else { alert('Payment not completed yet: ' + paymentIntent?.status) }
  }
  return (
    <form className="space-y-4" onSubmit={pay}>
      <div className="text-sm text-gray-200">Total: <strong>€{(total/100).toFixed(2)}</strong> • Deposit: <strong>€{(amount/100).toFixed(2)}</strong></div>
      {clientSecret ? (<><PaymentElement /><button className="btn" disabled={!stripe}>Pay deposit</button></>) : (<p>Loading payment...</p>)}
    </form>
  )
}
