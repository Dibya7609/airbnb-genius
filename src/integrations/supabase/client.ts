// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ykekgdkwcyasinsgcyoa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZWtnZGt3Y3lhc2luc2djeW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1NjgwOTYsImV4cCI6MjA1NDE0NDA5Nn0.IHAksD_jaU-MSlQ9ATi1Bi8-0wcX4agRNElLC74eNAw";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);