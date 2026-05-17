"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Mail, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTeamMembers, inviteTeamMember, removeTeamMember } from "@/lib/api";

type TeamMember = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  joined_at: string;
};

export function TeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await getTeamMembers();
      setMembers(data);
    } catch {
      setMessage({ text: "Failed to load team members.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviteLoading(true);
      setMessage(null);
      await inviteTeamMember(inviteEmail, "Farm Manager");
      setMessage({ text: `Invitation sent to ${inviteEmail}`, type: "success" });
      setInviteEmail("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send invitation.";
      setMessage({ text: errorMessage, type: "error" });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to remove this member from your farm?")) return;
    
    try {
      setMessage(null);
      await removeTeamMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMessage({ text: "Member removed successfully.", type: "success" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove member.";
      setMessage({ text: errorMessage, type: "error" });
    }
  };

  return (
    <section id="team-management" data-dashboard-section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-3 scroll-mt-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-1 h-fit">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <Mail className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Invite a Manager</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Enter an email address to invite someone to manage your farm.
        </p>

        <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="manager@example.com"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <Button type="submit" disabled={inviteLoading} className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
            {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send Invitation
          </Button>
        </form>

        {message && (
          <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>
            {message.text}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-zinc-500" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Active Team Members</h3>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <ShieldAlert className="mb-2 h-6 w-6 text-zinc-400" />
            <p className="text-sm text-zinc-500">No managers added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                  <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">Role</th>
                  <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80">
                    <td className="py-3 text-zinc-900 dark:text-zinc-100 font-medium">{m.full_name}</td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-300">{m.email}</td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-300">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(m.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
