import { Link } from "react-router";
import { Button } from "../components/Button";
import { HeroAnimation } from "../components/HeroBackground";
import { Shield } from "lucide-react";

export function LandingPage() {
  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Shield className="w-5 h-5 text-foreground transition-transform duration-200 group-hover:scale-110" />
            <span className="font-semibold text-base tracking-tight">SecureVault AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" className="text-sm px-5 py-2">Log In</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="primary" className="text-sm px-5 py-2">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen overflow-hidden">

        {/* Dotted grid — always behind everything */}
        <div className="absolute inset-0 dotted-grid pointer-events-none z-0" />

        {/* Ambient blobs — neutral monochrome */}
        <div className="absolute top-1/4 left-1/6 w-[380px] h-[380px] bg-white/[0.02] blur-[110px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-[280px] h-[280px] bg-white/[0.015] blur-[90px] pointer-events-none z-0" />

        {/* Two-column grid — fills full screen height */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-0 items-center pt-16">

          {/* ── LEFT: text + CTAs ── */}
          <div className="flex flex-col justify-center py-16 lg:pr-12">

            {/* Eyebrow */}
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground mb-5 animate-fade-in">
              Zero-knowledge &middot; AI-powered
            </p>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold leading-[1.06] tracking-[-0.02em] mb-6 animate-fade-in hero-title">
              SecureVault AI
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-3 animate-fade-in stagger-1">
              Private, AI-powered encrypted storage built for developers.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 animate-fade-in stagger-2">
              Store, search, and chat with your documents — without ever exposing your data.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 animate-fade-in stagger-3">
              <Link to="/dashboard">
                <Button
                  variant="primary"
                  className="text-base px-9 py-3"
                >
                  Sign Up Free
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="secondary" className="text-base px-9 py-3">
                  Log In
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <p className="mt-8 text-xs text-muted-foreground/50 animate-fade-in stagger-4">
              End-to-end encrypted &middot; No plaintext ever leaves your device
            </p>
          </div>

          {/* ── RIGHT: animation panel ── */}
          <div className="relative w-full h-[520px] lg:h-full lg:min-h-screen flex items-center justify-center">
            {/* Faint border frame */}
            <div className="absolute inset-4 lg:inset-8 border border-white/[0.04] rounded-[16px] pointer-events-none" />
            {/* Canvas fills the right column — nodes are positioned inside it */}
            <div className="absolute inset-0">
              <HeroAnimation />
            </div>
          </div>

        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
      </section>

    </div>
  );
}
