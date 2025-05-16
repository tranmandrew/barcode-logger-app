import { createClient } from "@supabase/supabase-js";

// 🔐 Replace with your actual values:
const SUPABASE_URL = "https://your-project.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnamN2ZHBuaWR4cGp2cGpldGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU1Mzk0NSwiZXhwIjoyMDYyMTI5OTQ1fQ.wP1XImhtbrY9yJhhJymDas7HhXzac0QeDmKtej41jWs"; // Found in Project Settings > API > Service Role

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setAdminRole() {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    "24a01f89-dff0-4969-8167-bcdce8b3e2c6", // your UID
    {
      user_metadata: { role: "admin" },
    }
  );

  if (error) {
    console.error("❌ Failed to set role:", error);
  } else {
    console.log("✅ Role successfully set to 'admin':", data?.user?.user_metadata);
  }
}

setAdminRole();
