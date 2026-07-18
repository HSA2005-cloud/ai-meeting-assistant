import { supabase } from "./supabaseClient";
const BASE = import.meta.env.VITE_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!res.ok) {
        // read body for the backend's error detail if it sends one
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
    }
    return res.json();
}