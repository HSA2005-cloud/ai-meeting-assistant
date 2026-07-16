import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMeetings } from '../api/meetings'

function DashboardPage() {
    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        getMeetings()
            .then((data) => setMeetings(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return <p className="p-8 text-gray-500">Loading meetings...</p>
    }

    if (error) {
        return <p className="p-8 text-red-600">Error: {error}</p>
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Your Meetings</h1>
            <div className="flex flex-col gap-3">
                {meetings.map((meeting) => (
                    <Link
                        key={meeting.id}
                        to={`/meetings/${meeting.id}`}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                        <div className="flex justify-between items-center">
                            <span className="font-medium">{meeting.title}</span>
                            <span className="text-sm text-gray-500 capitalize">{meeting.status}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default DashboardPage