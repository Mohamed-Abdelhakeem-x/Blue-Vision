"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Camera, Loader2, UserRound} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {useLocale} from "next-intl";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {Button} from "@/components/ui/button";
import {useAuthSession} from "@/hooks/use-auth-session";
import {fetchMyProfileDetail, updateMyProfile} from "@/lib/api";
import {formatBoostedConfidence} from "@/lib/confidence";
import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";

function imageSrc(imageB64?: string | null) {
  return imageB64 ? `data:image/jpeg;base64,${imageB64}` : null;
}

export function UserProfilePage() {
  const queryClient = useQueryClient();
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).profile;
  const {token} = useAuthSession();
  const navItems = useMemo<DashboardNavItem[]>(() => [], []);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"farmer" | "expert">("farmer");
  const [avatar, setAvatar] = useState<File | null>(null);

  const profileQuery = useQuery({
    queryKey: ["my-profile", token],
    queryFn: async () => fetchMyProfileDetail(token ?? ""),
    enabled: Boolean(token)
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      updateMyProfile({
        token: token ?? "",
        fullName: fullName.trim() || profileQuery.data?.full_name || "",
        role,
        avatar
      }),
    onSuccess: async () => {
      setAvatar(null);
      await queryClient.invalidateQueries({queryKey: ["my-profile"]});
    }
  });

  const profile = profileQuery.data;
  useEffect(() => {
    if (profile?.role === "farmer" || profile?.role === "expert") {
      setRole(profile.role);
    }
  }, [profile?.role]);
  const previewSrc = avatar ? URL.createObjectURL(avatar) : imageSrc(profile?.avatar_b64);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="profile"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          <UserRound className="h-3.5 w-3.5" />
          {copy.lead}
        </div>
      }
      contentClassName="overflow-auto"
    >
      {!profile ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {copy.loading}
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
          <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                  {previewSrc ? (
                    <img src={previewSrc} alt={profile.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-14 w-14 text-[var(--text-tertiary)]" />
                  )}
                </div>
                <label className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300">
                  <Camera className="h-4 w-4" />
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} />
                </label>
              </div>

              <h1 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{profile.full_name}</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{profile.email}</p>
              <div className="mt-4 inline-flex rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                {copy.roleLabel}: {profile.role}
              </div>

              <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.posts}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{profile.posts_count}</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.joined}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    <span suppressHydrationWarning>{new Date(profile.created_at.endsWith("Z") ? profile.created_at : profile.created_at + "Z").toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <input
                defaultValue={profile.full_name}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={copy.usernamePlaceholder}
                className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-blue-600/40"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRole("farmer")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${role === "farmer" ? "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-300" : "border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"}`}
                >
                  {copy.farmer}
                </button>
                <button
                  type="button"
                  onClick={() => setRole("expert")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${role === "expert" ? "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-300" : "border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"}`}
                >
                  {copy.expert}
                </button>
              </div>
              <Button type="button" className="w-full rounded-2xl" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {copy.saveProfile}
              </Button>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{copy.yourPosts}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.yourPostsDescription}</p>

            <div className="mt-5 space-y-4">
              {profile.posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                  {copy.noPosts}
                </div>
              ) : (
                profile.posts.map((post) => (
                  <div key={post.id} className="overflow-hidden rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                    {post.image_b64 ? <img src={imageSrc(post.image_b64) ?? ""} alt={post.ai_fish_species} className="h-52 w-full object-cover" /> : null}
                    <div className="space-y-3 p-4">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.plant}</p>
                          <p className="mt-1 font-semibold text-[var(--text-primary)]">{post.ai_fish_species}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.disease}</p>
                          <p className="mt-1 font-semibold text-[var(--text-primary)]">{post.ai_health_status}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.confidence}</p>
                          <p className="mt-1 font-semibold text-[var(--text-primary)]">{formatBoostedConfidence(post.ai_confidence_score)}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-[var(--text-primary)]">{post.post_text}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                        <span suppressHydrationWarning>{new Date(post.created_at.endsWith("Z") ? post.created_at : post.created_at + "Z").toLocaleString()}</span>
                        <span>{post.likes_count} {copy.likes}</span>
                        <span>{post.comments_count} {copy.comments}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      )}
    </DashboardShell>
  );
}
