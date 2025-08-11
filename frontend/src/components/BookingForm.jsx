// frontend/src/components/BookingForm.jsx
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

const API = import.meta.env.VITE_API_BASE

// --- inline i18n (self-contained) ---
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

// Secret admin access: triple-click the logo → prompt for VITE_ADMIN_KEY → /admin
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
      alt={alt}
      onClick={onClick}
    />
  )
}

// Prices
const PRICE_LABELS = {
  carbon: {
    front_doors: 'Front Doors €40',
    rear_doors: 'Rear Doors €40',
    front_windshield: 'Front Windshield €80',
    rear_windshield: 'Rear Windshield €80',
  },
  ceramic: {
    front_doors: 'Front Doors €60',
    rear_doors: 'Rear Doors €60',
    front_windshield: 'Front Windshield €100',
    rear_windshield: 'Rear Windshield €100',
  },
}
const PRICE_VALUES = {
  carbon: {
    front_doors: 4000,
    rear_doors: 4000,
    front_windshield: 8000,
    rear_windshield: 8000,
  },
  ceramic: {
    front_doors: 6000,
    rear_doors: 6000,
    front_windshield: 10000,
    rear_windshield: 10000,
  },
}

export default function BookingForm() {
  const { lang, setLang, t } = useI18n()

  // form state
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)

  const [full_name, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicle, setVehicle] = useState('')

  const [tint_quality, setQuality] = useState('carbon')
  const [availableShades, setAvailableShades] = useState([])
  const [tint_shades, setTintShades] = useState([]) // multiple via checkboxes

  const [windows, setWindows] = useState([])
  const [submitting, setSubmitting] = useState(false)

  // load slots when date changes
  useEffect(() => {
    if (!date) return
    axios
      .get(`${API}/api/bookings/availability`, { params: { date } })
      .then((r) => {
        setSlots(r.data.slots || [])
        setSlot(null)
      })
      .catch(() => setSlots([]))
  }, [date])

  // load shades (admin-configured) with fallback
  useEffect(() => {
    axios
      .get(`${API}/api/public/shades`)
      .then((res) => {
        const list =
          res.data && res.data[tint_quality]
            ? res.data[tint_quality].filter((s) => s.available).map((s) => s.shade)
            : []
        if (list.length) {
          setAvailableShades(list)
          setTintShades((prev) => prev.filter((x) => list.includes(x)))
        } else {
          setAvailableShades(
            tint_quality === 'carbon' ? ['50%', '35%', '20%', '5%', '1%'] : ['20%', '5%']
          )
        }
      })
      .catch(() => {
        setAvailableShades(
          tint_quality === 'carbon' ? ['50%', '35%', '20%', '5%', '1%'] : ['20%', '5%']
        )
      })
  }, [tint_quality])

  const priceValues = PRICE_VALUES[tint_quality]
  const priceLabels = PRICE_LABELS[tint_quality]

  const amount_total = useMemo(
    () => windows.reduce((sum, key) => sum + (priceValues[key] || 0), 0),
    [windows, priceValues]
  )
  const amount_deposit = Math.floor(amount_total * 0.5)

  const toggleWindow = (key) =>
    setWindows((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))

  const toggleShade = (shade) =>
    setTintShades((prev) => (prev.includes(shade) ? prev.filter((s) => s !== shade) : [...prev, shade]))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!API) return alert('API base URL missing. Set VITE_API_BASE and redeploy the frontend.')
    if (!date) return alert('Please choose a date.')
    if (!slot) return alert('Please choose a time.')
    if (windows.length === 0) return alert('Please select at least one window.')
    if (tint_shades.length === 0) return alert('Please select at least one tint shade.')
    if (amount_deposit <= 0) return alert('Deposit cannot be zero.')

    const payload = {
      full_name,
      phone,
      email,
      vehicle,
      tint_quality,
      tint_shades, // array
      windows,
      date,
      start_time: slot.start,
      end_time: slot.end,
      amount_total,
      amount_deposit,
    }

    try {
      setSubmitting(true)
      // 1) Create booking
      const createRes = await axios.post(`${API}/api/bookings/create`, payload)
      const booking_id = createRes.data?.booking_id
      if (!booking_id) throw new Error('No booking_id returned')

      // 2) Stripe Checkout
      const payRes = await axios.post(`${API}/api/payments/checkout`, { booking_id })
      const url = payRes.data?.url
      if (!url) throw new Error('No checkout url returned')

      // 3) Redirect to Stripe
      try {
        window.location.assign(url)
        return
      } catch {}
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || err?.message || 'Stripe error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-4">
          <AdminSecretLogo src={logo} alt="logo" />
          <div className="mt-2">
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </div>
        </div>
        <h1 className="text-accent text-3xl font-bold">{t('book_title')}</h1>
      </div>

      {/* form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block mb-1">{t('date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Time */}
          <div>
            <label className="block mb-1">{t('time')}</label>
            <select
              value={slot ? `${slot.start}-${slot.end}` : ''}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return setSlot(null)
                const [s, t] = v.split('-')
                const chosen = slots.find((x) => x.start === s && x.end === t)
                if (!chosen?.enabled) return
                setSlot({ start: s, end: t })
              }}
            >
              <option value="">{t('select_time')}</option>
              {slots
                .slice()
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((s, i) => (
                  <option key={i} value={`${s.start}-${s.end}`} disabled={!s.enabled}>
                    {s.start}{s.end ? ` - ${s.end}` : ''} {!s.enabled ? `(${t('not_available')})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Name / Phone */}
          <div>
            <label className="block mb-1">{t('full_name')}</label>
            <input value={full_name} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">{t('phone')}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          {/* Email / Vehicle */}
          <div>
            <label className="block mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">{t('vehicle')}</label>
            <input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="e.g., Toyota Corolla 2018"
              required
            />
          </div>

          {/* Quality */}
          <div>
            <label className="block mb-1">{t('tint_quality')}</label>
            <select value={tint_quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="carbon">{t('carbon_tint')}</option>
              <option value="ceramic">{t('ceramic_tint')}</option>
            </select>
          </div>

          {/* Shades (checkboxes) */}
          <div>
            <label className="block mb-1">{t('tint_shades')}</label>
            <div className="grid grid-cols-3 gap-3">
              {availableShades.map((shade) => (
                <label key={shade} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tint_shades.includes(shade)}
                    onChange={() => toggleShade(shade)}
                  />
                  <span>{shade}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Windows To Work On */}
        <div className="space-y-2">
          <label className="block">{t('windows_to_work')}</label>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(priceLabels).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={windows.includes(k)}
                  onChange={() => toggleWindow(k)}
                />
                <span>{priceLabels[k]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Totals + Button */}
        <div className="flex items-center justify-between bg-black/60 rounded-xl p-3 border border-accent/40">
          <div className="text-sm">
            {t('total')}: <strong>€{(amount_total / 100).toFixed(2)}</strong> • {t('deposit')}:{' '}
            <strong>€{(amount_deposit / 100).toFixed(2)}</strong>
          </div>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Loading payment…' : t('pay_and_book')}
          </button>
        </div>
      </form>
    </div>
  )
}
