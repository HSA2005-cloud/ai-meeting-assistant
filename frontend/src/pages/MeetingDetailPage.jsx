import { useParams } from 'react-router-dom'

function MeetingDetailPage() {
    const { id } = useParams()

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Meeting Detail Page</h1>
            <p className="text-gray-600">Meeting ID: {id}</p>
        </div>
    )
}

export default MeetingDetailPage