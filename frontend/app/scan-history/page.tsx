"use client";

import {History} from "lucide-react";
import {useMemo} from "react";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {ScanHistoryContent} from "@/components/scan-history/scan-history-content";

export default function ScanHistoryPage() {
	const navItems = useMemo<DashboardNavItem[]>(() => {
		return [];
	}, []);

	return (
		<DashboardShell
			navItems={navItems}
			activeSection="scan-history"
			topBarLead={
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)]">
						<History className="h-4 w-4" />
					</div>
					<div>
						<p className="text-sm font-semibold text-[var(--text-primary)]">History</p>
						<p className="text-xs text-[var(--text-tertiary)]">All previous scans in one place</p>
					</div>
				</div>
			}
			contentClassName="overflow-auto"
		>
			<ScanHistoryContent />
		</DashboardShell>
	);
}
