export const mockMeetings = [
    {
        id: "m1",
        title: "Q3 Marketing Sync",
        status: "completed",
        created_at: "2026-07-10T09:00:00Z",
    },
    {
        id: "m2",
        title: "Backend Architecture Review",
        status: "processing",
        created_at: "2026-07-14T14:30:00Z",
    },
    {
        id: "m3",
        title: "CS 301 Lecture: Graph Algorithms",
        status: "completed",
        created_at: "2026-07-15T11:00:00Z",
    },
]

export const mockMeetingDetails = {
    m1: {
        transcript: "Full transcript text would go here for the Q3 Marketing Sync meeting...",
        summary: "The team reviewed Q3 marketing performance, discussed the underperforming paid social campaign, and aligned on shifting budget toward organic content for Q4.",
        key_points: [
            "Paid social CAC increased 22% month-over-month",
            "Organic content engagement outperformed paid by 3x",
            "Q4 budget will shift 40% from paid to organic",
        ],
        action_items: [
            "Sarah to draft Q4 organic content calendar by July 18",
            "Raj to pause underperforming paid social campaigns",
        ],
        decisions: [
            "Approved 40% budget reallocation from paid to organic for Q4",
        ],
    },
    m2: {
        transcript: "Full transcript text would go here for the Backend Architecture Review...",
        summary: "The team discussed migrating from FastAPI BackgroundTasks to Celery + Redis to handle increased job queue load, with a target migration date before the stretch-feature phase.",
        key_points: [
            "Current BackgroundTasks approach won't scale past ~50 concurrent jobs",
            "Celery + Redis proposed as the replacement job queue",
        ],
        action_items: [
            "Backend engineer to prototype Celery integration by next sync",
        ],
        decisions: [
            "Migration will happen in Week 7, not before, to avoid disrupting MVP timeline",
        ],
    },
    m3: {
        transcript: "Full transcript text would go here for the CS 301 lecture...",
        summary: "Lecture covered graph traversal algorithms, focusing on the differences between BFS and DFS, their time complexities, and common use cases for each.",
        key_points: [
            "BFS uses a queue, DFS uses a stack (or recursion)",
            "BFS finds shortest path in unweighted graphs, DFS does not guarantee this",
            "Both run in O(V + E) time complexity",
        ],
        action_items: [
            "Complete problem set 4 before next lecture",
        ],
        decisions: [],
    },
}