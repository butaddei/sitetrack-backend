import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      <header className="py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-[#f97316]">Site</span>Track
          </span>
          <nav className="flex gap-6 text-sm text-slate-300">
            <Link href="/privacy"><span className="hover:text-white cursor-pointer">Privacy</span></Link>
            <Link href="/terms"><span className="hover:text-white cursor-pointer">Terms</span></Link>
            <Link href="/support"><span className="hover:text-white cursor-pointer">Support</span></Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        <div className="w-16 h-16 bg-[#f97316] rounded-2xl flex items-center justify-center mb-6 text-2xl font-black">S</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">SiteTrack</h1>
        <p className="text-slate-400 text-lg max-w-md mb-10">
          Field service & painting business management. Manage projects, track time, and generate invoices — all from your phone.
        </p>
        <a
          href="https://apps.apple.com/app/sitetrack"
          className="bg-[#f97316] hover:bg-[#ea6c10] text-white font-bold px-8 py-3.5 rounded-xl text-base transition-colors"
        >
          Download on the App Store
        </a>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full text-left">
          <FeatureCard icon="📋" title="Project Management" desc="Track active jobs, assign workers, and manage client details in one place." />
          <FeatureCard icon="⏱️" title="Time Tracking" desc="Employees clock in and out on site. Hours roll up automatically for payroll and invoicing." />
          <FeatureCard icon="📄" title="Instant Invoices" desc="Subcontractors generate professional PDF invoices for any date range in seconds." />
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-slate-500 text-sm">© {new Date().getFullYear()} SiteTrack. All rights reserved.</span>
          <nav className="flex gap-6 text-sm">
            <Link href="/privacy"><span className="text-slate-500 hover:text-[#f97316] cursor-pointer">Privacy Policy</span></Link>
            <Link href="/terms"><span className="text-slate-500 hover:text-[#f97316] cursor-pointer">Terms of Use</span></Link>
            <Link href="/support"><span className="text-slate-500 hover:text-[#f97316] cursor-pointer">Support</span></Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
