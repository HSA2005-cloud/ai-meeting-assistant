import type { AnalyticsResponse } from '../types/contracts'
import { apiFetch } from '../lib/apiClient'

/**
 * GET /meetings/analytics -> aggregated dashboard metrics.
 * Computed server-side so it can include insights (action items, decisions,
 * key points) drawn from each meeting's latest summary.
 */
export function fetchAnalytics(): Promise<AnalyticsResponse> {
  return apiFetch('/meetings/analytics')
}
