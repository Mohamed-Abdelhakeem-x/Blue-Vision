"use client";

import { ArrowRight, Check, Loader2, Info, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  authGoogle,
  fetchProfile,
  storeAuthTokens,
  storeUserRole,
  signup,
  requestEmailVerification,
  checkGoogleUser,
  getInvitationInfo
} from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingField } from "@/components/auth/floating-field";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");

  const t = useTranslations("auth");

  // State definitions
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [verificationCode, setVerificationCode] = useState("");

  // Invitation info states
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<{
    email: string;
    farm_name: string;
    role: string;
    inviter_name: string;
  } | null>(null);

  // Google flow states
  const [googleCred, setGoogleCred] = useState<string | null>(null);
  const [isGoogleNewUser, setIsGoogleNewUser] = useState(false);

  // Fetch invitation info if token is present
  useEffect(() => {
    if (inviteToken) {
      setInviteLoading(true);
      getInvitationInfo(inviteToken)
        .then((info) => {
          setInvitationInfo(info);
          setEmail(info.email);
        })
        .catch((err) => {
          setInviteError(err instanceof Error ? err.message : "Invalid or expired invitation link.");
        })
        .finally(() => {
          setInviteLoading(false);
        });
    }
  }, [inviteToken]);

  // Real-time password validations
  const isMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isPasswordValid = isMinLength && hasUpper && hasNumber && hasSpecial;

  // Form submit step 1 (Sends OTP email)
  const onSubmitStep1 = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    if (!isPasswordValid) {
      setError("Please ensure your password meets all strength requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      await requestEmailVerification(email, "signup");
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.error"));
    } finally {
      setLoading(false);
    }
  };

  // Form submit step 2 (Verifies OTP & Registers User)
  const onSubmitStep2 = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      await signup({
        email,
        password,
        full_name: username,
        verification_code: verificationCode,
        invite_token: inviteToken
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.error"));
    } finally {
      setLoading(false);
    }
  };

  // Google signup / complete profile form submit
  const onSubmitGoogleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    if (!isPasswordValid) {
      setError("Please ensure your password meets all strength requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }

    if (!googleCred) return;

    setLoading(true);
    setSuccess(false);

    try {
      const payload = await authGoogle(googleCred, inviteToken, password, username);
      storeAuthTokens(payload);
      try {
        const profile = await fetchProfile(payload.access_token);
        storeUserRole(profile.role);
      } catch {}
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Signup Failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle invitation loading and error states
  if (inviteLoading) {
    return (
      <div className="flex min-h-[calc(100vh-90px)] flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="mt-3 text-sm text-[var(--text-secondary)]">Checking invitation validity...</p>
      </div>
    );
  }

  if (inviteError) {
    return (
      <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md flex-col items-center justify-center px-4 py-10">
          <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 text-center shadow-[var(--shadow-md)]">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Invitation Invalid</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{inviteError}</p>
            <Button asChild className="mt-6 w-full bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8]">
              <Link href="/login">Go to Login</Link>
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-8rem] top-8 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-8rem] h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md flex-col items-center justify-center px-4 py-10">
        {/* Oceanic BlueVision Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center select-none"
        >
          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-blue-600 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 18px rgba(34,211,238,0.4))" }}>Blue</span>
            <span className="text-white/90" style={{ filter: "drop-shadow(0 0 10px rgba(147,197,253,0.5))" }}>Vision</span>
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-cyan-400/60">
            <motion.span animate={{ scaleX: [1, 1.6, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block h-px w-5 bg-gradient-to-r from-transparent to-cyan-400/50" />
            See Deeper · Act Faster
            <motion.span animate={{ scaleX: [1, 1.6, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block h-px w-5 bg-gradient-to-l from-transparent to-cyan-400/50" />
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className="w-full">
          <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-md)]">
            
            {/* INVITATION INTRO BANNER */}
            {invitationInfo && !isGoogleNewUser && (
              <div className="mb-5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3.5 text-sm text-cyan-300">
                <p className="font-semibold text-cyan-200">Team Invitation Received</p>
                <p className="mt-1 text-xs opacity-90">
                  {invitationInfo.inviter_name} invited you to join <strong className="text-white">{invitationInfo.farm_name}</strong> as a <strong className="text-white">{invitationInfo.role}</strong>.
                </p>
              </div>
            )}

            {/* GOOGLE PROFILE REGISTRATION FORM */}
            {isGoogleNewUser && googleCred ? (
              <>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Complete Your Profile
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Set a password for your account linked to {email}.
                </p>

                <form onSubmit={onSubmitGoogleSignup} className="mt-6 space-y-4">
                  <FloatingField
                    label={t("common.username")}
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />

                  <div className="group relative opacity-70">
                    <FloatingField
                      label={t("common.email")}
                      type="email"
                      value={email}
                      disabled
                      className="cursor-not-allowed bg-zinc-900/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <FloatingField
                      label={t("common.password")}
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />

                    {/* Password validation checklist UI */}
                    {password && (
                      <div className="rounded-lg bg-zinc-950/40 p-3 space-y-1.5 border border-zinc-800">
                        <p className="text-xs font-semibold text-[var(--text-secondary)]">Password requirements:</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          { [
                            { label: "8+ characters", met: isMinLength },
                            { label: "1 uppercase letter", met: hasUpper },
                            { label: "1 number", met: hasNumber },
                            { label: "1 special char (!@#...)", met: hasSpecial },
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className={item.met ? "text-green-500 font-bold" : "text-zinc-600"}>
                                {item.met ? "✓" : "○"}
                              </span>
                              <span className={item.met ? "text-zinc-300" : "text-zinc-500"}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <FloatingField
                    label={t("common.confirmPassword")}
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    className="mt-2 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]"
                    disabled={loading || success || !isPasswordValid}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("register.loading")}
                      </>
                    ) : success ? (
                      <>
                        <Check className="h-4 w-4" />
                        Creating Profile...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleCred(null);
                        setIsGoogleNewUser(false);
                        if (!inviteToken) setEmail("");
                      }}
                      className="text-cyan-400 hover:underline"
                    >
                      Cancel Google signup
                    </button>
                  </div>

                  {error && <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p>}
                </form>
              </>
            ) : (
              /* STANDARD FORM WITH STEP 1 & 2 */
              <>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {step === 1 ? t("register.title") : "Verify your email"}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {step === 1 ? t("register.subtitle") : `We sent a 6-digit code to ${email}`}
                </p>

                {step === 1 ? (
                  <form onSubmit={onSubmitStep1} className="mt-6 space-y-4">
                    <FloatingField
                      label={t("common.username")}
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                    />

                    {/* Pre-filled readonly email if invitation, else normal email field */}
                    {invitationInfo ? (
                      <div className="group relative opacity-80">
                        <FloatingField
                          label={t("common.email")}
                          type="email"
                          value={email}
                          disabled
                          className="cursor-not-allowed bg-zinc-900/50"
                        />
                      </div>
                    ) : (
                      <>
                        <FloatingField
                          label={t("common.email")}
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                        />
                        <p className="-mt-2 text-xs text-[var(--text-tertiary)]">{t("common.emailHint")}</p>
                      </>
                    )}

                    <div className="space-y-2">
                      <FloatingField
                        label={t("common.password")}
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />

                      {/* Password validation checklist UI */}
                      {password && (
                        <div className="rounded-lg bg-zinc-950/40 p-3 space-y-1.5 border border-zinc-800">
                          <p className="text-xs font-semibold text-[var(--text-secondary)]">Password requirements:</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            { [
                              { label: "8+ characters", met: isMinLength },
                              { label: "1 uppercase letter", met: hasUpper },
                              { label: "1 number", met: hasNumber },
                              { label: "1 special char (!@#...)", met: hasSpecial },
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className={item.met ? "text-green-500 font-bold" : "text-zinc-600"}>
                                  {item.met ? "✓" : "○"}
                                </span>
                                <span className={item.met ? "text-zinc-300" : "text-zinc-500"}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <FloatingField
                      label={t("common.confirmPassword")}
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />

                    <Button
                      type="submit"
                      className="mt-2 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]"
                      disabled={loading || success || !isPasswordValid}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("register.loading")}
                        </>
                      ) : success ? (
                        <>
                          <Check className="h-4 w-4" />
                          {t("register.success")}
                        </>
                      ) : (
                        <>
                          {t("register.cta")}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                    {error && <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p>}
                  </form>
                ) : (
                  <form onSubmit={onSubmitStep2} className="mt-6 space-y-4">
                    {/* CHECK SPAM WARNING */}
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Can't find the code?</strong> Please check your <strong>spam or junk</strong> folder. Mail deliveries can occasionally land there.
                      </div>
                    </div>

                    <FloatingField
                      id="code"
                      type="text"
                      label="6-Digit Verification Code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={loading || success}
                      required
                    />

                    <Button
                      type="submit"
                      disabled={loading || success || verificationCode.length !== 6}
                      className="mt-1 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("register.loading")}
                        </>
                      ) : success ? (
                        <>
                          <Check className="h-4 w-4" />
                          {t("register.success")}
                        </>
                      ) : (
                        "Verify & Create Account"
                      )}
                    </Button>
                    <div className="text-center text-sm">
                      <button type="button" onClick={() => setStep(1)} className="text-cyan-400 hover:underline">
                        Change details / Resend code
                      </button>
                    </div>
                    {error && <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p>}
                  </form>
                )}

                {/* SOCIAL GOOGLE SIGN-IN SECTION */}
                {step === 1 && (
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-[var(--border-primary)]" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[var(--card-bg)] px-2 text-[var(--text-tertiary)]">Or continue with</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={async (credentialResponse) => {
                          if (!credentialResponse.credential) return;
                          try {
                            setLoading(true);
                            setError(null);

                            // Check if Google user exists
                            const checkResult = await checkGoogleUser(credentialResponse.credential);

                            if (checkResult.exists) {
                              // Existing user: proceed with direct login
                              const payload = await authGoogle(credentialResponse.credential, inviteToken);
                              storeAuthTokens(payload);
                              try {
                                const profile = await fetchProfile(payload.access_token);
                                storeUserRole(profile.role);
                              } catch {}
                              setSuccess(true);
                              setTimeout(() => router.push("/dashboard"), 800);
                            } else {
                              // New user: ask for username + password
                              setGoogleCred(credentialResponse.credential);
                              setIsGoogleNewUser(true);
                              if (checkResult.email) setEmail(checkResult.email);
                              if (checkResult.name) setUsername(checkResult.name);
                            }
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Google Signup Failed");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        onError={() => setError("Google Signup Failed")}
                        theme="filled_blue"
                        shape="rectangular"
                        text="continue_with"
                        width="100%"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="mt-5 text-center text-sm text-[var(--text-secondary)]">
              {t("register.switchPrompt")}{" "}
              <Link href="/login" className="font-semibold text-[#2563eb] hover:underline">
                {t("register.switchCta")}
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-90px)] items-center justify-center bg-[var(--bg-primary)]">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
