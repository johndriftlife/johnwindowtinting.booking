import React, { useState } from 'react'
import Admin from '../components/Admin.jsx'

export default function AdminPage(){
  const [authorized, setAuthorized] = useState(false)
  const [pass, setPass] = useState('')

  const enter = (e)=>{ e.preventDefault(); if(pass.trim().length){ setAuthorized(true) } }

  if (!authorized){
    return (
      <div className="section">
        <div className="card max-w-md mx-auto space-y-4">
          <h1>Admin Access</h1>
          <form onSubmit={enter} className="space-y-3">
            <div>
              <label className="block mb-1">Admin key</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter admin key" />
            </div>
            <button className="btn w-full">Enter</button>
          </form>
          <p className="text-xs text-gray-400">This key is the backend <code>ADMIN_PASSWORD</code>.</p>
        </div>
      </div>
    )
  }

  return <Admin injectedPassword={pass} />
}
