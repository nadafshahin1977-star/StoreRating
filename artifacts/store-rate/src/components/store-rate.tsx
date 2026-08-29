import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, BarChart3, Building2, ChevronLeft, ChevronRight, CircleUserRound, House, LogOut, MapPin, Menu, Search, Settings, ShieldCheck, Star, Store, Users, X } from "lucide-react";

type ShellProps = { children: ReactNode; user?: { name: string; role: string } | null };

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`flex items-center gap-2.5 font-display text-xl font-bold tracking-tight ${inverse ? "text-[hsl(var(--sidebar-foreground))]" : "text-foreground"}`} data-testid="link-logo">
    <span className="grid size-9 place-items-center rounded-[11px] bg-accent text-accent-foreground shadow-sm"><Star className="size-[18px] fill-current" /></span>
    <span>Store<span className={inverse ? "text-accent" : "text-[hsl(var(--chart-2))]"}>Rate</span></span>
  </Link>;
}

const adminLinks = [{ href: "/admin", label: "Overview", icon: BarChart3 }, { href: "/admin/users", label: "People", icon: Users }, { href: "/admin/stores", label: "Stores", icon: Building2 }];
const userLinks = [{ href: "/stores", label: "Discover stores", icon: MapPin }, { href: "/settings", label: "Settings", icon: Settings }];
const ownerLinks = [{ href: "/owner", label: "Your dashboard", icon: BarChart3 }, { href: "/settings", label: "Settings", icon: Settings }];

export function AppShell({ children, user }: ShellProps) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const role = user?.role;
  const links = role === "ADMIN" ? adminLinks : role === "STORE_OWNER" ? ownerLinks : userLinks;
  function signOut() { localStorage.removeItem("store-rate-token"); localStorage.removeItem("store-rate-user"); setLocation("/"); }
  return <div className="min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-12 flex items-center justify-between"><Logo inverse /><button className="rounded-lg p-1 md:hidden" onClick={() => setOpen(false)} data-testid="button-close-menu" aria-label="Close menu"><X className="size-5" /></button></div>
      <div className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/45">{role === "ADMIN" ? "Workspace" : role === "STORE_OWNER" ? "Owner space" : "Your neighborhood"}</div>
      <nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${location === href ? "bg-sidebar-accent text-accent" : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`}><Icon className="size-[18px]" />{label}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent p-4">
        <div className="mb-3 grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{user?.name?.slice(0, 1).toUpperCase() || "S"}</div>
        <p className="truncate text-sm font-bold">{user?.name || "StoreRate member"}</p><p className="mt-0.5 text-xs text-sidebar-foreground/50">{role === "ADMIN" ? "Administrator" : role === "STORE_OWNER" ? "Store owner" : "Member"}</p>
        <button onClick={signOut} className="mt-4 flex items-center gap-2 text-xs font-semibold text-sidebar-foreground/55 hover:text-accent" data-testid="button-sign-out"><LogOut className="size-3.5" /> Sign out</button>
      </div>
    </aside>
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-foreground/25 md:hidden" onClick={() => setOpen(false)} data-testid="button-menu-backdrop" />}
    <main className="min-h-[100dvh] md:pl-[248px]"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur md:px-10"><button className="rounded-xl border border-border p-2 md:hidden" onClick={() => setOpen(true)} data-testid="button-open-menu" aria-label="Open menu"><Menu className="size-5" /></button><div className="hidden md:block" /><div className="flex items-center gap-3"><span className="hidden text-xs font-semibold text-muted-foreground sm:block">A better way to be local</span><div className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{user?.name?.slice(0, 1).toUpperCase() || "S"}</div></div></header><div className="mx-auto max-w-[1400px] px-5 py-8 md:px-10 md:py-10">{children}</div></main>
  </div>;
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--chart-2))]">{eyebrow}</p><h1 className="font-display text-4xl font-bold tracking-[-.035em] text-foreground md:text-5xl" data-testid={`text-title-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = { primary: "bg-primary text-primary-foreground hover:opacity-90", secondary: "bg-accent text-accent-foreground hover:brightness-95", ghost: "border border-border bg-card text-foreground hover:bg-secondary", danger: "bg-destructive text-destructive-foreground hover:opacity-90" };
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

export function TextInput({ label, icon: Icon, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: typeof Search }) {
  return <label className="block space-y-2">{label && <span className="text-xs font-bold text-foreground">{label}</span>}<span className="relative block">{Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}<input className={`h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-accent ${Icon ? "pl-10" : ""}`} {...props} /></span></label>;
}

export function Stars({ value, interactive = false, onChange, size = "size-4" }: { value: number; interactive?: boolean; onChange?: (value: number) => void; size?: string }) {
  return <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} disabled={!interactive} onClick={() => onChange?.(star)} className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} ${star <= value ? "text-accent" : "text-muted/80"} p-0.5`} data-testid={interactive ? `button-rating-${star}` : `icon-star-${star}`} aria-label={interactive ? `Rate ${star} out of 5` : undefined}><Star className={`${size} ${star <= value ? "fill-current" : ""}`} /></button>)}</div>;
}

export function RatingLine({ rating, count }: { rating: number; count: number }) {
  return <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold">{rating ? rating.toFixed(1) : "—"}</span><Stars value={Math.round(rating)} /><span className="text-xs text-muted-foreground">({count})</span></div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-rise"><div className="mb-6 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--chart-2))]">New record</p><h2 className="mt-1 font-display text-2xl font-bold">{title}</h2></div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" data-testid="button-close-modal" aria-label="Close dialog"><X className="size-5" /></button></div>{children}</div></div>;
}

export function StateMessage({ kind, onRetry }: { kind: "loading" | "error" | "empty"; onRetry?: () => void }) {
  if (kind === "loading") return <div className="space-y-3" aria-label="Loading"><div className="h-16 animate-pulse rounded-xl bg-secondary" /><div className="h-16 animate-pulse rounded-xl bg-secondary" /><div className="h-16 animate-pulse rounded-xl bg-secondary" /></div>;
  if (kind === "error") return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center"><p className="font-display text-xl font-bold">That view did not load</p><p className="mt-2 text-sm text-muted-foreground">The connection may have blinked. Try once more.</p><Button variant="ghost" className="mt-5" onClick={onRetry} data-testid="button-retry">Try again</Button></div>;
  return <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-[hsl(var(--chart-2))]"><Store className="size-6" /></div><p className="mt-4 font-display text-xl font-bold">A quiet corner, for now</p><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Nothing here yet. The next thoughtful addition starts with you.</p></div>;
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-between border-t border-border px-1 pt-4"><span className="font-mono text-[11px] text-muted-foreground">Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="ghost" className="size-9 min-h-9 p-0" disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid="button-page-previous"><ChevronLeft className="size-4" /></Button><Button variant="ghost" className="size-9 min-h-9 p-0" disabled={page >= totalPages} onClick={() => onPage(page + 1)} data-testid="button-page-next"><ChevronRight className="size-4" /></Button></div></div>;
}

export function RolePill({ role }: { role: string }) {
  const label = role === "NORMAL_USER" ? "Member" : role === "STORE_OWNER" ? "Owner" : "Admin";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${role === "ADMIN" ? "bg-[hsl(var(--chart-3)/.12)] text-[hsl(var(--chart-3))]" : role === "STORE_OWNER" ? "bg-[hsl(var(--chart-2)/.14)] text-[hsl(var(--chart-2))]" : "bg-secondary text-muted-foreground"}`}>{label}</span>;
}

export { ArrowLeft, CircleUserRound, House, Settings, ShieldCheck, Users };