import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        setLoading(false)

        if (error) {
            setError(error.message)
            return
        }

        navigate('/dashboard')
    }

    return (
        <div className="p-8 max-w-sm">
            <h1 className="text-2xl font-bold mb-6">Log In</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border border-gray-300 rounded-md px-3 py-2"
                />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white rounded-md py-2 disabled:opacity-50"
                >
                    {loading ? 'Logging in...' : 'Log In'}
                </button>
            </form>
            <p className="mt-4 text-sm text-gray-600">
                Don't have an account? <Link to="/signup" className="text-blue-600">Sign up</Link>
            </p>
        </div>
    )
}

export default LoginPage