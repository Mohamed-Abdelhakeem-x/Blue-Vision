import Link from "next/link";
import { Fish } from "lucide-react";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import FooterCTA from "@/components/landing/FooterCTA";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* Simple Header */}
      <header className="absolute top-0 w-full z-50 py-6 border-b border-white/5">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
              <Fish className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Blue-Vision</span>
          </Link>
          <nav className="flex gap-4">
            <Link 
              href="/login"
              className="text-sm font-medium text-zinc-300 hover:text-white px-4 py-2 transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/register"
              className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        <Hero />
        <Features />
        <HowItWorks />
        <FooterCTA />
      </main>

      {/* Simple Footer */}
      <footer className="py-8 bg-zinc-950 border-t border-zinc-900 text-center text-zinc-500 text-sm">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} Blue-Vision. Empowering Nile Tilapia Farmers worldwide.</p>
        </div>
      </footer>
    </div>
  );
}
