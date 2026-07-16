import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function ProtectedRoute() {
    const [session, setSession] = useState(undefined)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
        })

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => listener.subscription.unsubscribe()
    }, [])

    if (session === undefined) {
        return <p className="p-8 text-gray-500">Checking login status...</p>
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}

export default ProtectedRoute