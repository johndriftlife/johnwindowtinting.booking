// frontend/src/components/BookingForm.jsx
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

// Accent color for the Pay button (logo red)
const ACCENT = '#C62828' // change this one line if you need a different red

const API = import.meta.env.VITE_API_BASE
const DICT={
  en:{book_title:'Book an Appointment',date:'Date',time:'Time',full_name:'Full name',phone:'Phone',email:'Email address',vehicle:'Vehicle',tint_quality:'Tint Quality',tint_shades:'Tint Shades',windows_to_work:'Windows To Work On',carbon_tint:'Carbon Tint',ceramic_tint:'Ceramic Tint',select_time:'Select time',not_available:'Not available',total:'Total',deposit:'Deposit (50%)',pay_and_book:'Pay Deposit & Book Appointment'},
  fr:{book_title:'Prendre un rendez-vous',date:'Date',time:'Heure',full_name:'Nom complet',phone:'Téléphone',email:'Adresse e-mail',vehicle:'Véhicule',tint_quality:'Qualité du film',tint_shades:'Teintes',windows_to_work:'Vitres à traiter',carbon_tint:'Film Carbone',ceramic_tint:'Film Céramique',select_time:'Choisir une heure',not_available:'Indisponible',total:'Total',deposit:'Acompte (50%)',pay_and_book:'Payer l’acompte et réserver'}
}

function useI18n(){
  const [lang,setLang]=useState(()=>localStorage.getItem('lang')||'en')
  useEffect(()=>{ localStorage.setItem('lang',lang); document.documentElement.setAttribute('lang',lang) },[lang])
  const t=(k)=>(DICT[lang]||DICT.en)[k]||k
  return {lang,setLang,t}
}

// Inline SVG f
