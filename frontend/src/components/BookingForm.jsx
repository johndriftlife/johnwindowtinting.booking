import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
const ACCENT = '#C62828'
const API = import.meta.env.VITE_API_BASE

const DICT = {
  en: {
    book_title:'Book an Appointment', date:'Date', time:'Time', full_name:'Full name',
    phone:'Phone', email:'Email address', vehicle:'Vehicle', tint_quality:'Tint Quality',
    tint_shades:'Tint Shades', windows_to_work:'Windows To Work On', carbon_tint:'Carbon Tint',
    ceramic_tint:'Ceramic Tint', select_time:'Select time', not_available:'Not available',
    total:'Total', deposit:'Deposit (50%)', pay_and_book:'Pay Deposit & Book Appointment',
    pay_now:'Pay Now', paying:'Processing…', cancel:'Cancel',
    payment_ready:'Enter your card to pay deposit',
    payment_done:'Payment received! Your booking is confirmed.',
    payment_error:'Payment form failed to load. Please refresh.'
  },
  fr: {
    book_title:'Prendre un rendez-vous', date:'Date', time:'Heure', full_name:'Nom complet',
    phone:'Téléphone', email:'Adresse e-mail', vehicle:'Véhicule', tint_quality:'Qualité du film',
    tint_shades:'Teintes', windows_to_work:'Vitres à traiter', carbon_tint:'Film Carbone',
    ceramic_tint:'Film Céramique', select_time:'Choisir une heure', not_available:'Indisponible',
    total:'Total', deposit:'Acompte (50%)', pay_and_book:'Payer l’acompte et réserver',
    pay_now:'Payer maintenant', paying:'Traitement…', cancel:'Annuler',
    payment_ready:'Entrez votre carte pour payer l’acompte',
    payment_done:'Paiement reçu ! Votre rendez-vous est confirmé.',
    payment_error:'Le formulaire de paiement n’a pas pu charger. Rechargez la page.'
  }
}

function useI18n(){
  const [lang,setLang]=useState(()=>localStorage.getItem('lang')||'en')
  useEffect(()=>{ localStorage.setItem('lang',lang); document.documentElement.setAttribute('lang',lang) },[lang])
  const t=(k)=>(DICT[lang]||DICT.en)[k]||k
  return {lang,setLang,t}
}

function Flag({code}){
  const style={display:'inline-block',width:20,height:14,borderRadius:2,overflow:'hidden',boxShadow:'0 0 0 1px #0006 inset'}
  if(code==='fr'){
    return (<svg viewBox="0 0 3 2" style={style}><rect width="1" height="2" x="0" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2
