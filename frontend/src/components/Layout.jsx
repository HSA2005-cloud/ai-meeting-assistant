import { Link, Outlet } from 'react-router-dom'

function Layout() {
    return (
        <div>
            <nav className="flex gap-4 p-4 border-b border-gray-200">
                <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
                <Link to="/signup" className="text-blue-600 hover:underline">Signup</Link>
                <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            </nav>
            <main>
                <Outlet />
            </main>
        </div>
    )
}

export default Layout