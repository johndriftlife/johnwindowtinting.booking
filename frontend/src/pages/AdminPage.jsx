import React, { useState } from 'react'
import Admin from '../components/Admin.jsx'

export default function AdminPage(){
  const [authorized, setAuthorized] = useState(false)
  const [pass, setPass] = useState('')

  const enter = (e)=>{ e.preventDefault(); if(pass.trim().length){ setAuthorized(true) } }

  if (!authorized){
    return (
      <div style={{maxWidth: 400, margin: '40px auto'}}>
        <h1>Admin Access</h1>
        <form onSubmit={enter}>
          <label>Admin key</label>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={{display:'block', width:'100%', padding:8, marginTop:6, marginBottom:12}} />
          <button>Enter</button>
        </form>
        <p style={{fontSize:12, opacity:.8}}>This key is the backend <code>ADMIN_PASSWORD</code>.</p>
      </div>
    )
  }

  return <Admin injectedPassword={pass} />
}
