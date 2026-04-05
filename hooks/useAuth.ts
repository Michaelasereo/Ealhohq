import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const supabase = createClient();

  const getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  };

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const getRole = async () => {
    const user = await getUser();
    return (user?.app_metadata?.role as string | undefined) ?? null;
  };

  const getStatus = async () => {
    const user = await getUser();
    return (user?.app_metadata?.status as string | undefined) ?? null;
  };

  const signOut = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = user?.app_metadata?.role as string | undefined;
    await supabase.auth.signOut();
    window.location.href = role === "therapist" ? "/therapist/login" : "/login";
  };

  const isTherapist = async () => (await getRole()) === "therapist";
  const isPatient = async () => (await getRole()) === "patient";
  const isAdmin = async () => (await getRole()) === "admin";

  return {
    getSession,
    getUser,
    getRole,
    getStatus,
    signOut,
    isTherapist,
    isPatient,
    isAdmin,
  };
}
