import { supabase } from "@/integrations/supabase/client";

// Login with email/password
export async function loginWithEmail(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

// Sign up with email/password, then create a profile entry
export async function signUpWithEmail(email: string, password: string, fullName: string = '', phone?: string, address?: string) {
  // Get the current environment's URL
  const isDevelopment = process.env.NODE_ENV === 'development';
  const baseUrl = isDevelopment 
    ? window.location.origin 
    : 'https://healthsaarthi.netlify.app'; // Replace with your actual Netlify domain

  const redirectUrl = `${baseUrl}/#type=recovery`;
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        phone: phone,
        address: address
      }
    },
  });

  // If user is created but session is null, it means email verification is pending. This is not an error.
  if (data?.user && !data?.session && authError === null) {
    return { data, error: null }; // Treat as success for the purpose of the AuthScreen message
  }

  // If we have a session, try to sign in immediately
  if (!data?.session && data?.user) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInData?.session) {
      return { data: signInData, error: null };
    }
  }

  return { data, error: authError };
}

// Fetch profile details for a given user id
export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, phone, address")
    .eq("id", userId)
    .maybeSingle();
  return { data, error };
}

