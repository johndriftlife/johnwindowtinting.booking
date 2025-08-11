// frontend/src/components/BookingForm.jsx
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

const API = import.meta.env.VITE_API_BASE

// --- inline i18n (no external files needed) ---
const DICT = {
  en: {
    book_title: 'Book an Appointment',
    date: 'Date',
    time: 'Time',
    full_name: 'Full name',
    phone: 'Phone',
    email: 'Email address',
    vehicle: 'Vehicle',
    tint_quality: 'Tint Quality',
    tint_shades: 'Tint Shades',
    windows_to_work: 'Windows To Work On',
    carbon_tint: 'Carbon Tint',
    ceramic_tint: 'Ceramic Tint',
    select_time: 'Select time',
    not_available: 'Not available',
    total: 'Total',
    deposit: 'Deposit (50%)',
    pay_and_book: 'Pay Deposit & Book Appointment',
  },
  fr: {
    book_title: 'Prendre un rendez-vous',
    date: 'Date',
    time: 'Heure',
    full_name: 'Nom complet',
    phone: 'Téléphone',
    email: 'Adresse e-mail',
    vehicle: 'Véhicule',
    tint_quality: 'Qualité du film',
    tint_shades: 'Teintes',
    windows_to_work: 'Vitres à traiter',
    carbon_tint: 'Film Carbone',
    ceramic_tint: 'Film Céramique',
    select_time: 'Choisir une heure',
    not_available: 'Indisponible',
    total: 'Total',
    deposit: 'Acompte (50%)',
    pay_and_book: 'Payer l’acompte et réserver',
  },
}

function useI18n() {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')
  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.setAttribute('lang', lang)
  }, [lang])
  const t = (k) => (DICT[lang] || DICT.en)[k] || k
  return { lang, setLang, t }
}

function LanguageSwitcher({ lang, setLang }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xl" aria-hidden>{lang === 'fr' ? '🇫🇷' : '🇺🇸'}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="bg-black border border-accent/40 rounded-md px-2 py-1 text-sm"
        aria-label="Language"
      >
        <option value="en">🇺🇸 English</option>
        <option value="fr">🇫🇷 Français</option>
      </select>
    </div>
  )
}

// Secret admin access: triple-click the logo → prompt for VITE_ADMIN_KEY
function AdminSecretLogo({ src, alt }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!count) return
    const t = setTimeout(() => setCount(0), 600)
    return () => clearTimeout(t)
  }, [count])
  const onClick = () => {
    const n = count + 1
    setCount(n)
    if (n >= 3) {
      setCount(0)
      const key = window.prompt('Enter admin key:')
      if (!key) return
      if (key === import.meta.env.VITE_ADMIN_KEY) {
        window.location.assign('/admin')
      } else {
        alert('Invalid key')
      }
    }
  }
  return (
    <img
      src={src}
      className="h-64 w-auto mx-auto rounded-xl cursor-pointer"
      alt={alt
