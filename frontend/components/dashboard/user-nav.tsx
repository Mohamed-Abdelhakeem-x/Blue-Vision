"use client";

import { LogOut } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UserNavProps {
  user: UserProfile | null;
  onLogout: () => Promise<void> | void;
}

export function UserNav({ user, onLogout }: UserNavProps) {
  return (
    <Card className="flex items-center justify-between gap-4 rounded-[1.15rem]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Farmer Profile</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{user?.full_name ?? "Anonymous Grower"}</h2>
        <p className="text-sm text-muted-foreground">{user?.email ?? "Sign in to unlock saved detections"}</p>
      </div>
      <Button onClick={onLogout} className="gap-2 bg-card text-foreground hover:bg-muted dark:border-border/70 dark:bg-card">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </Card>
  );
}
