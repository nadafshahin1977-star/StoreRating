import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/store-rate";

export default function NotFound() {
  return <div className="noise min-h-[100dvh] bg-background p-6 md:p-10"><Logo /><div className="mx-auto flex min-h-[75dvh] max-w-xl flex-col items-center justify-center text-center"><div className="paper-grid grid size-20 place-items-center rounded-[26px] bg-secondary text-[hsl(var(--chart-2))]"><Compass className="size-9" /></div><p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--chart-2))]">Wrong corner</p><h1 className="mt-3 font-display text-6xl font-bold tracking-[-.06em]">404</h1><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">This page wandered off. The places worth knowing are still right here.</p><Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground" data-testid="link-return-home"><ArrowLeft className="size-4" /> Return home</Link></div></div>;
}