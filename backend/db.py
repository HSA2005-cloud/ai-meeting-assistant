from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Backend uses the service key — it can read/write all tables.
# Never expose this client or key to the frontend.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
