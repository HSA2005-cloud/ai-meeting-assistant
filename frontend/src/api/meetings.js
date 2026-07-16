import { mockMeetings, mockMeetingDetails } from '../mocks/meetings'

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getMeetings() {
    await delay(500)
    return mockMeetings
}

export async function getMeetingById(id) {
    await delay(500)
    const detail = mockMeetingDetails[id]
    if (!detail) {
        throw new Error(`Meeting with id "${id}" not found`)
    }
    return detail
}