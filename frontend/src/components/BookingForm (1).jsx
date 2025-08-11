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

// Inline SVG flags so they always render
function Flag({code}){
  const style={display:'inline-block',width:20,height:14,borderRadius:2,overflow:'hidden',boxShadow:'0 0 0 1px #0006 inset'}
  if(code==='fr'){
    return (<svg viewBox="0 0 3 2" style={style} aria-hidden="true"><rect width="1" height="2" x="0" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#EF4135"/></svg>)
  }
  // default to US
  return (
    <svg viewBox="0 0 190 100" style={style} aria-hidden="true">
      <rect width="190" height="100" fill="#B22234"/>
      {[...Array(6)].map((_,i)=>(<rect key={i} y={i*16+8} width="190" height="8" fill="#fff"/>))}
      <rect width="76" height="56" fill="#3C3B6E"/>
    </svg>
  )
}

function LanguageSwitcher({lang,setLang}){
  const [open,setOpen]=useState(false)
  const current=lang==='fr'?{code:'fr',label:'Français'}:{code:'en',label:'English'}
  const items=[{code:'en',label:'English'},{code:'fr',label:'Français'}]
  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <button type='button' onClick={()=>setOpen(o=>!o)}
        style={{display:'inline-flex',alignItems:'center',gap:8,background:'#111',border:`1px solid ${ACCENT}66`,borderRadius:12,color:'#D4AF37',padding:'8px 12px'}}>
        <Flag code={current.code} /><span style={{fontSize:12}}>{current.label}</span>
      </button>
      {open&&(
        <div style={{position:'absolute',zIndex:50,top:'110%',left:0,background:'#111',border:`1px solid ${ACCENT}66`,borderRadius:12,overflow:'hidden'}}>
          {items.map(it=>(
            <div key={it.code} onClick={()=>{setLang(it.code);setOpen(false)}}
              style={{display:'flex',gap:8,alignItems:'center',padding:'8px 10px',cursor:'pointer',color:'#D4AF37'}}>
              <Flag code={it.code} /><span style={{fontSize:12}}>{it.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminSecretLogo({src,alt}){
  const [count,setCount]=useState(0)
  useEffect(()=>{ if(!count) return; const t=setTimeout(()=>setCount(0),600); return ()=>clearTimeout(t) },[count])
  const onClick=()=>{
    const n=count+1; setCount(n)
    if(n>=3){
      setCount(0)
      const key=window.prompt('Enter admin key:'); if(!key) return
      if(key===import.meta.env.VITE_ADMIN_KEY){ window.location.assign('/admin') } else { alert('Invalid key') }
    }
  }
  return <img src={src} alt={alt} onClick={onClick} style={{height:160,width:'auto',borderRadius:12,cursor:'pointer',display:'block',margin:'0 auto'}}/>
}

const PRICE_LABELS={carbon:{front_doors:'Front Doors €40',rear_doors:'Rear Doors €40',front_windshield:'Front Windshield €80',rear_windshield:'Rear Windshield €80'},ceramic:{front_doors:'Front Doors €60',rear_doors:'Rear Doors €60',front_windshield:'Front Windshield €100',rear_windshield:'Rear Windshield €100'}}
const PRICE_VALUES={carbon:{front_doors:4000,rear_doors:4000,front_windshield:8000,rear_windshield:8000},ceramic:{front_doors:6000,rear_doors:6000,front_windshield:10000,rear_windshield:10000}}

export default function BookingForm(){
  const {lang,setLang,t}=useI18n()
  const [date,setDate]=useState(''); const [slots,setSlots]=useState([]); const [slot,setSlot]=useState(null)
  const [full_name,setFullName]=useState(''); const [phone,setPhone]=useState(''); const [email,setEmail]=useState(''); const [vehicle,setVehicle]=useState('')
  const [tint_quality,setQuality]=useState('carbon'); const [availableShades,setAvailableShades]=useState([]); const [tint_shades,setTintShades]=useState([])
  const [windows,setWindows]=useState([]); const [submitting,setSubmitting]=useState(false)

  useEffect(()=>{ if(!date) return; axios.get(`${API}/api/bookings/availability`,{params:{date}}).then(r=>{setSlots(r.data.slots||[]);setSlot(null)}).catch(()=>setSlots([])) },[date])

  useEffect(()=>{
    axios.get(`${API}/api/public/shades`).then(res=>{
      const list=(res.data&&res.data[tint_quality])? res.data[tint_quality].filter(s=>s.available).map(s=>s.shade):[]
      if(list.length){ setAvailableShades(list); setTintShades(prev=>prev.filter(x=>list.includes(x))) }
      else { setAvailableShades(tint_quality==='carbon'?['50%','35%','20%','5%','1%']:['20%','5%']) }
    }).catch(()=>{ setAvailableShades(tint_quality==='carbon'?['50%','35%','20%','5%','1%']:['20%','5%']) })
  },[tint_quality])

  const values=PRICE_VALUES[tint_quality], labels=PRICE_LABELS[tint_quality]
  const amount_total=useMemo(()=>windows.reduce((s,w)=>s+(values[w]||0),0),[windows,values])
  const amount_deposit=Math.floor(amount_total*0.5)
  const toggleWindow=(k)=> setWindows(p=> p.includes(k)? p.filter(x=>x!==k): [...p,k])
  const toggleShade=(sh)=> setTintShades(p=> p.includes(sh)? p.filter(x=>x!==sh): [...p,sh])

  async function submit(e){
    e.preventDefault()
    if(!API) return alert('Missing VITE_API_BASE')
    if(!date) return alert('Choose a date')
    if(!slot) return alert('Choose a time')
    if(windows.length===0) return alert('Select at least one window')
    if(tint_shades.length===0) return alert('Select at least one tint shade')
    if(amount_deposit<=0) return alert('Deposit is zero')

    const payload={full_name,phone,email,vehicle,tint_quality,tint_shades,windows,date,start_time:slot.start,end_time:slot.end,amount_total,amount_deposit}
    try{ setSubmitting(true) }catch{}

    try{
      const r1=await axios.post(`${API.replace(/\/$/,'')}/api/bookings/create`,payload)
      const id=r1.data?.booking_id
      if(!id) throw new Error('No booking_id')
      const r2=await axios.post(`${API.replace(/\/$/,'')}/api/payments/checkout`,{booking_id:id})
      const url=r2.data?.url; if(!url) throw new Error('No checkout url')

      try{ window.location.assign(url); return }catch{}
      const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove()
    }catch(err){
      console.error(err)
      alert(err?.response?.data?.error||err?.message||'Error')
    } finally { try{ setSubmitting(false) }catch{} }
  }

  return (
    <div style={{display:'grid',gap:24}}>
      <div style={{textAlign:'center',display:'grid',gap:8}}>
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:12}}>
          <AdminSecretLogo src={logo} alt="logo" />
          <LanguageSwitcher lang={lang} setLang={setLang} />
        </div>
        <h1 style={{color:'#D4AF37',fontSize:28,fontWeight:700}}>{t('book_title')}</h1>
      </div>

      <form className='space-y-4' onSubmit={submit} style={{display:'grid',gap:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><label style={{display:'block',marginBottom:6}}>{t('date')}</label><input type='date' value={date} onChange={e=>setDate(e.target.value)} /></div>
          <div><label style={{display:'block',marginBottom:6}}>{t('time')}</label>
            <select value={slot?`${slot.start}-${slot.end}`:''}
              onChange={e=>{ const v=e.target.value; if(!v) return setSlot(null); const [s,t]=v.split('-'); const chosen=slots.find(x=>x.start===s&&x.end===t); if(!chosen?.enabled) return; setSlot({start:s,end:t}) }}>
              <option value="">{t('select_time')}</option>
              {slots.slice().sort((a,b)=>a.start.localeCompare(b.start)).map((s,i)=>(
                <option key={i} value={`${s.start}-${s.end}`} disabled={!s.enabled}>
                  {s.start}{s.end?` - ${s.end}`:''} {!s.enabled?`(${t('not_available')})`:''}
                </option>
              ))}
            </select>
          </div>
          <div><label style={{display:'block',marginBottom:6}}>{t('full_name')}</label><input value={full_name} onChange={e=>setFullName(e.target.value)} required/></div>
          <div><label style={{display:'block',marginBottom:6}}>{t('phone')}</label><input value={phone} onChange={e=>setPhone(e.target.value)} required/></div>
          <div><label style={{display:'block',marginBottom:6}}>{t('email')}</label><input type='email' value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div><label style={{display:'block',marginBottom:6}}>{t('vehicle')}</label><input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder='e.g., Toyota Corolla 2018' required/></div>
          <div><label style={{display:'block',marginBottom:6}}>{t('tint_quality')}</label><select value={tint_quality} onChange={e=>setQuality(e.target.value)}><option value='carbon'>{t('carbon_tint')}</option><option value='ceramic'>{t('ceramic_tint')}</option></select></div>
          <div><label style={{display:'block',marginBottom:6}}>{t('tint_shades')}</label><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>{availableShades.map(sh=>(<label key={sh} style={{display:'flex',gap:8,alignItems:'center'}}><input type='checkbox' checked={tint_shades.includes(sh)} onChange={()=>setTintShades(p=> p.includes(sh)? p.filter(x=>x!==sh): [...p,sh])}/><span>{sh}</span></label>))}</div></div>
        </div>
        <div style={{display:'grid',gap:8}}>
          <label style={{display:'block'}}>{t('windows_to_work')}</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {Object.keys(labels).map(k=>(
              <label key={k} style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type='checkbox' checked={windows.includes(k)} onChange={()=>toggleWindow(k)}/><span>{labels[k]}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#111',border:'1px solid #D4AF3766',borderRadius:12,padding:12}}>
          <div style={{fontSize:14}}>{t('total')}: <strong>€{(amount_total/100).toFixed(2)}</strong> • {t('deposit')}: <strong>€{(amount_deposit/100).toFixed(2)}</strong></div>
          <button className='btn' type='submit' disabled={submitting}
            style={{background:ACCENT,color:'#000',padding:'8px 12px',borderRadius:12,fontWeight:700,boxShadow:`0 0 0 1px ${ACCENT} inset`}}>
            {submitting?'Loading payment…':t('pay_and_book')}
          </button>
        </div>
      </form>
    </div>
  )
}
