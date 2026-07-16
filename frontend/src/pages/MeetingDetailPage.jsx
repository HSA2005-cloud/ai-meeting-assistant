import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getMeetingById } from '../api/meetings'

function MeetingDetailPage() {
    const { id } = useParams()
    const [meeting, setMeeting] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setLoading(true)
        setError(null)
        getMeetingById(id)
            .then((data) => setMeeting(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return <p className="p-8 text-gray-500">Loading meeting...</p>
    }

    if (error) {
        return <p className="p-8 text-red-600">Error: {error}</p>
    }

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Summary</h1>
            <p className="text-gray-700 mb-6">{meeting.summary}</p>

            <h2 className="text-lg font-semibold mb-2">Key Points</h2>
            <ul className="list-disc list-inside mb-6 text-gray-700">
                {meeting.key_points.map((point, i) => (
                    <li key={i}>{point}</li>
                ))}
            </ul>

            <h2 className="text-lg font-semibold mb-2">Action Items</h2>
            <ul className="list-disc list-inside mb-6 text-gray-700">
                {meeting.action_items.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
            </ul>

            <h2 className="text-lg font-semibold mb-2">Decisions</h2>
            {meeting.decisions.length > 0 ? (
                <ul className="list-disc list-inside text-gray-700">
                    {meeting.decisions.map((decision, i) => (
                        <li key={i}>{decision}</li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-400 italic">No decisions recorded.</p>
            )}
        </div>
    )
}

export default MeetingDetailPage