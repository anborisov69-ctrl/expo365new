'use client';

/**
 * AdminShell
 * ──────────
 * Client-side orchestrator for the Exhibitor Admin layout.
 * Owns the sidebar collapsed/expanded state and wires together
 * AdminSidebar ←→ AdminHeader ←→ scrollable workspace.
 *
 * Rendered as the sole child of the Server Component layout.tsx so that
 * the Server Component boundary is preserved — only this subtree opts into
 * the client bundle.
 *
 * Positioning strategy:
 *   `fixed inset-0 z-[60]` — completely overlays the parent HoReCa layout
 *   (which renders its own <Header /> at z-50) without modifying it.
 */

import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  // Sidebar starts expanded on lg, collapsed on smaller viewports
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on tablet-sized screens on first mount
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setCollapsed(e.matches);
    };
    handleChange(mq);
    mq.addEventListener('change', handleChange as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handleChange as (e: MediaQueryListEvent) => void);
  }, []);

  return (
    /**
     * Outer shell: fixed overlay covering the entire viewport.
     * z-[60] sits above the parent HoReCa <Header /> which is z-50.
     */
    <div className="fixed inset-0 z-[60] flex overflow-hidden bg-[#F8FAFC]">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* ── Right Column: Header + Workspace ────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Sticky top header */}
        <AdminHeader onToggleSidebar={() => setCollapsed((v) => !v)} />

        {/* Scrollable workspace */}
        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'bg-[#F8FAFC]',
            // Comfortable padding on all sides; slightly reduced on mobile
            'p-4 sm:p-6 lg:p-8'
          )}
        >
          {/* Content container — centred and capped for ultra-wide monitors */}
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
