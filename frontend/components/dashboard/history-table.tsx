"use client";

import type { ScanHistory } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface HistoryTableProps {
  rows: ScanHistory[];
}

export function HistoryTable({ rows }: HistoryTableProps) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">Recent Field Activity</h3>
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Last {rows.length} scans</p>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disease</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Domain</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.disease_type}</TableCell>
                <TableCell>{(row.confidence_score * 100).toFixed(1)}%</TableCell>
                <TableCell className="capitalize">{row.domain}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No scans yet. Upload your first leaf image.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
