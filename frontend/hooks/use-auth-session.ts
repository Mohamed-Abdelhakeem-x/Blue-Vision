"use client";

import {useEffect, useState} from "react";

import {AUTH_STATE_CHANGED_EVENT, getStoredAccessToken, getStoredProfile} from "@/lib/api";
import type {UserProfile} from "@/lib/types";

type AuthSessionState = {
  token: string | null;
  profile: UserProfile | null;
};

function readAuthSession(): AuthSessionState {
  if (typeof window === "undefined") {
    return {token: null, profile: null};
  }

  return {
    token: getStoredAccessToken(),
    profile: getStoredProfile()
  };
}

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<AuthSessionState>(() => readAuthSession());

  useEffect(() => {
    const syncSession = () => {
      setSession(readAuthSession());
    };

    syncSession();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return session;
}
