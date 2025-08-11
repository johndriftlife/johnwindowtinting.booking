import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
const ACCENT = '#C62828'
const API = import.meta.env.VITE_API_BASE

const DICT={
  en:{book_title:'Book an Appointment',date:'Date',time:'Time',full_name:'Full name',phone:'Phone',email:'Email address',vehicle:'Vehicle',tint_quality:'Tint Quality',tint_shades:'Tint Shades',windows_to_work:'Windows To Work On',carbon_tint:'Carbon Tint',ceramic_tint:'Ceramic Tint',select_time:'Select time',not_available:'Not available',total:'Total',deposit:'Deposit (50%)',pay_and_book:'Pay Deposit & Book Appointment',pay_now:'Pay Now',paying:'Processing…',cancel:'Cancel',payment_ready:'Enter your card to pay deposit',payment_done:'Payment received! Your booking is confirmed.',payment_error:'Payment form failed to load. Please refresh.'},
  fr:{book_title:'Prendre un rendez-vous',date:'Date',time:'Heure',full_name:'Nom complet',phone:'Téléphone',email:'Adresse e-mail',vehicle:'Véhicule',tint_quality:'Qualité du film',tint_shades:'Teintes',windows_to_work:'Vitres à traiter',carbon_tint:'Film Carbone',ceramic_tint:'Film Céramique',select_time:'Choisir une heure',not_available:'Indisponible',total:'Total',deposit:'Acompte (50%)',pay_and_book:'Payer l’acompte et réserver',pay_now:'Payer maintenant',paying:'Traitement…',cancel:'Annuler',payment_ready:'Entrez votre carte pour payer l’acompte',payment_done:'Paiement reçu ! Votre rendez-vous est confirmé.',payment_error:'Le formulaire de paiement n’a pas pu charger. Rechargez la page.'}
}

function useI18n(){ const [lang,setLang]=useState(()=>localStorage.getItem('lang')||'en'); useEffect(()=>{localStorage.setItem('lang',lang);document.documentElement.setAttribute('lang',lang)},[lang]); const t=(k)=>(DICT[lang]||DICT.en)[k]||k; return {lang,setLang,t} }

function Flag({code}){ const style={display:'inline-block',width:20,height:14,borderRadius:2,overflow:'hidden',boxShadow:'0 0 0 1px #0006 inset'}; if(code==='fr'){return(<svg viewBox="0 0 3 2" style={style}><rect width="1" height="2" x="0" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#EF4135"/></svg>)} return(<svg viewBox="0 0 190 100" style={style}><rect width="190" height="100" fill="#B22234"/>{[...Array(6)].map((_,i)=>(<rect key={i} y={i*16+8} width="190" height="8" fill="#fff"/>))}<rect width="76" height="56" fill="#3C3B6E"/></svg>) }

function LanguageSwitcher({lang,setLang}){ const [open,setOpen]=useState(false); const current=lang==='fr'?{code:'fr',label:'Français'}:{code:'en',label:'English'}; const items=[{code:'en',label:'English'},{code:'fr',label:'Français'}]; return (<div style={{position:'relative',display:'inline-block'}}><button type='button' onClick={()=>setOpen(o=>!o)} style={{display:'inline-flex',alignItems:'center',gap:8,background:'#111',border:`1px solid ${ACCENT}66`,borderRadius:12,color:'#D4AF37',padding:'8px 12px'}}><Flag code={current.code} /><span style={{fontSize:12}}>{current.label}</span></button>{open&&(<div style={{position:'absolute',zIndex:50,top:'110%',left:0,background:'#111',border:`1px solid ${ACCENT}66`,borderRadius:12,overflow:'hidden'}}>{items.map(it=>(<div key={it.code} onClick={()=>{setLang(it.code);setOpen(false)}} style={{display:'flex',gap:8,alignItems:'center',padding:'8px 10px',cursor:'pointer',color:'#D4AF37'}}><Flag code={it.code} /><span style={{fontSize:12}}>{it.label}</span></div>))}</div>)}</div>) }

function AdminSecretLogo({src,alt}){ const [count,setCount]=useState(0); useEffect(()=>{ if(!count) return; const t=setTimeout(()=>setCount(0),1500); return ()=>clearTimeout(t) },[count]); const onClick=()=>{ const n=count+1; setCount(n); if(n>=3){ setCount(0); const key=window.prompt('Enter admin key:'); if(!key) return; if(key===import.meta.env.VITE_ADMIN_KEY){ window.location.hash='#/admin' } else { alert('Invalid key') } } }; return <img src={src} alt={alt} onClick={onClick} style={{height:160,width:'auto',borderRadius:12,cursor:'pointer',display:'block',margin:'0 auto'}}/> }

const PRICE_LABELS={carbon:{front_doors:'Front Doors €40',rear_doors:'Rear Doors €40',front_windshield:'Front Windshield €80',rear_windshield:'Rear Windshield €80'},ceramic:{front_doors:'Front Doors €60',rear_doors:'Rear Doors €60',front_windshield:'Front Windshield €100',rear_windshield:'Rear Windshield €100'}}
const PRICE_VALUES={carbon:{front_doors:4000,rear_doors:4000,front_windshield:8000,rear_windshield:8000},ceramic:{front_doors:6000,rear_doors:6000,front_windshield:10000,rear_windshield:10000}}

export default function BookingForm(){
  const {lang,setLang,t}=useI18n()
  const [date,setDate]=useState(''); const [slots,setSlots]=useState([]); const [slot,setSlot]=useState(null)
  const [slotsLoading,setSlotsLoading]=useState(false); const [slotsError,setSlotsError]=useState('')
  const [full_name,setFullName]=useState(''); const [phone,setPhone]=useState(''); const [email,setEmail]=useState(''); const [vehicle,setVehicle]=useState('')
  const [tint_quality,setQuality]=useState('carbon'); const [availableShades,setAvailableShades]=useState([]); const [tint_shades,setTintShades]=useState([])
  const [windows,setWindows]=useState([]); const [submitting,setSubmitting]=useState(false)

  // Payment Element state
  const [clientSecret,setClientSecret]=useState(''); const [showPayment,setShowPayment]=useState(false); const [paymentLoadErr,setPaymentLoadEr]()
