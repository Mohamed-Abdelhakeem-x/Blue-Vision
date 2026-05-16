"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { requestPasswordReset, verifyResetCode, resetPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingField } from "@/components/auth/floating-field";

type Step = "request" | "verify" | "reset" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  
  const [step, setStep] = useState<Step>("request");
  
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const onVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await verifyResetCode(email, code);
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await resetPassword(email, code, newPassword);
      setStep("success");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-[-9rem] h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md flex-col items-center justify-center px-4 py-10">
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className="w-full">
          <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-md)]">
            
            <AnimatePresence mode="wait">
              {step === "request" && (
                <motion.div key="request" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Forgot Password</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Enter your email to receive a 6-digit reset code.</p>

                  <form onSubmit={onRequestSubmit} className="mt-6 space-y-3">
                    <FloatingField
                      label={t("common.email")}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                    <Button type="submit" disabled={loading} className="mt-1 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : <><ArrowRight className="h-4 w-4" /> Send Reset Code</>}
                    </Button>
                    {error && <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p>}
                  </form>
                </motion.div>
              )}

              {step === "verify" && (
                <motion.div key="verify" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Check Your Email</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">We've sent a 6-digit code to <strong>{email}</strong>. <span className="text-amber-500/90">(Check your spam folder!)</span></p>

                  <form onSubmit={onVerifySubmit} className="mt-6 space-y-3">
                    <FloatingField
                      label="6-Digit Code"
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                      required
                    />
                    <Button type="submit" disabled={loading} className="mt-1 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><Check className="h-4 w-4" /> Verify Code</>}
                    </Button>
                    {error && <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p>}
                  </form>

                  <div className="mt-4 text-center text-sm text-[var(--text-secondary)]">
                    Didn't receive the code?{" "}
                    <button type="button" onClick={onResendCode} disabled={loading} className="font-semibold text-[#2563eb] hover:underline disabled:opacity-50">
                      Resend code
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "reset" && (
                <motion.div key="reset" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create New Password</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Almost there! Enter a secure new password.</p>

                  <form onSubmit={onResetSubmit} className="mt-6 space-y-3">
                    <FloatingField
                      label="New Password"
                      type="password"
                      minLength={8}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />
                    <FloatingField
                      label="Confirm New Password"
                      type="password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                    <Button type="submit" disabled={loading} className="mt-1 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : <><Check className="h-4 w-4" /> Reset Password</>}
                    </Button>
                    {error && <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p>}
                  </form>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-7 w-7 text-green-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Password Reset!</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Your password has been successfully updated. Redirecting you to login...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {step !== "success" && (
              <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                Remembered your password? <Link href="/login" className="font-semibold text-[#2563eb] hover:underline">Log in</Link>
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
