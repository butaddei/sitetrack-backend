import { useState } from "react";
import { Link } from "wouter";

const FAQ = [
  {
    q: "How do I get started with SiteTrack?",
    a: "Download SiteTrack from the App Store, tap 'Create Company Account', fill in your company name, your name, email, and password. You'll be set up as the Admin. You can then invite employees and start creating projects.",
  },
  {
    q: "What subscription plans are available?",
    a: "We offer three plans: Basic ($9.90/mo — up to 5 employees & 5 projects), Pro ($19.90/mo — up to 15 employees & 15 projects, plus invoicing and reports), and Business ($59.90/mo — unlimited everything + priority support). All plans are billed monthly via Apple In-App Purchase.",
  },
  {
    q: "How do I subscribe or upgrade my plan?",
    a: "Open the app and navigate to Billing (Admin → Plans & Billing). Select your desired plan and tap Subscribe. Payment is processed securely through your Apple ID — no card details are entered in the app.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Open iPhone Settings → tap your name → Subscriptions → find SiteTrack → tap Cancel Subscription. Cancellation takes effect at the end of the current billing period and you retain access until then.",
  },
  {
    q: "I switched phones — how do I restore my subscription?",
    a: "Open SiteTrack, reach the subscription screen (paywall), and tap 'Restore Purchases'. Make sure you're signed in to the same Apple ID used for the original purchase. Your subscription will be verified and restored.",
  },
  {
    q: "My subscription was restored but the app still shows the paywall. What do I do?",
    a: "Try these steps in order: (1) Tap 'Restore Purchases' again. (2) Force-close the app and reopen it. (3) Sign out and back in to your SiteTrack account. (4) Restart your device. If still not working, contact support.",
  },
  {
    q: "I was charged but I don't have access. What should I do?",
    a: "First tap 'Restore Purchases' on the paywall screen. If that doesn't work, contact us at support@sitetrack.online with your Apple ID email and we'll resolve it within 1 business day.",
  },
  {
    q: "How do employees clock in and out?",
    a: "Employees tap the timer card on their Home screen. Tap 'Clock In' to start tracking time for their active project. Tap 'Clock Out' to stop. Hours are recorded automatically and visible to Admins in the Timesheets tab.",
  },
  {
    q: "How do subcontractors generate invoices?",
    a: "Employees (subcontractors) go to the Invoices tab, set their date range, and tap 'Generate Invoice'. The app calculates hours worked and generates a PDF with all line items. They can then share it via email or AirDrop.",
  },
  {
    q: "Can I have multiple companies on one account?",
    a: "Each SiteTrack account belongs to one company. If you manage multiple businesses, you'll need separate accounts (different email addresses) for each.",
  },
  {
    q: "How do I add or remove employees?",
    a: "Admins go to the Employees tab. Tap the '+' button to add a new employee — enter their name, email, role, and hourly rate. They'll receive login credentials. To deactivate an employee, tap their profile and toggle their status to inactive.",
  },
  {
    q: "Is my business data secure?",
    a: "Yes. All data is encrypted in transit (HTTPS/TLS). Passwords are hashed and never stored in plaintext. Each company's data is completely isolated — no other company can access your data. We do not store any payment card information.",
  },
  {
    q: "How do I delete my account?",
    a: "Email support@sitetrack.online with the subject 'Account Deletion Request' and the email address associated with your account. We'll confirm within 2 business days and complete deletion within 30 days. Note: cancelling your Apple subscription does not automatically delete your account — you must request deletion separately.",
  },
];

export default function Support() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#0f172a] text-white py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-bold tracking-tight cursor-pointer">
              <span className="text-[#f97316]">Site</span>Track
            </span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/privacy"><span className="text-slate-300 hover:text-white cursor-pointer">Privacy</span></Link>
            <Link href="/terms"><span className="text-slate-300 hover:text-white cursor-pointer">Terms</span></Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Support</h1>
        <p className="text-slate-500 text-sm mb-10">We're here to help. Find answers below or contact us directly.</p>

        {/* Contact Card */}
        <div className="bg-[#0f172a] text-white rounded-2xl p-6 mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Contact Support</h2>
            <p className="text-slate-300 text-sm">We respond within 1 business day (Mon–Fri).</p>
          </div>
          <a
            href="mailto:support@sitetrack.online"
            className="bg-[#f97316] hover:bg-[#ea6c10] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            Email Us
          </a>
        </div>

        {/* Subscription Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">Subscription Troubleshooting</h2>
          <div className="space-y-4">
            <TroubleCard
              icon="🔄"
              title="Restore a Previous Purchase"
              steps={[
                "Open SiteTrack and reach the subscription screen",
                "Tap the 'Restore Purchases' button",
                "Ensure you're using the same Apple ID as the original purchase",
                "Wait a few seconds for Apple to verify your purchase",
              ]}
            />
            <TroubleCard
              icon="❌"
              title="Cancel Your Subscription"
              steps={[
                "Open iPhone Settings",
                "Tap your name at the top",
                "Tap 'Subscriptions'",
                "Find SiteTrack and tap it",
                "Tap 'Cancel Subscription'",
                "Access continues until end of current billing period",
              ]}
            />
            <TroubleCard
              icon="📱"
              title="Subscription Not Showing After Restore"
              steps={[
                "Tap 'Restore Purchases' again",
                "Force-close the app and reopen it",
                "Sign out of SiteTrack and sign back in",
                "Restart your iPhone",
                "If still not working, contact support@sitetrack.online",
              ]}
            />
            <TroubleCard
              icon="🔁"
              title="Charged But No Access"
              steps={[
                "Tap 'Restore Purchases' on the subscription screen",
                "If no subscription appears, check that you're signed into the correct Apple ID",
                "Contact support@sitetrack.online with your Apple ID email and receipt",
                "We'll investigate and resolve within 1 business day",
              ]}
            />
          </div>
        </section>

        {/* Account Deletion */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">Account Deletion Request</h2>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <p className="text-slate-700 mb-3">To request deletion of your account and all associated data:</p>
            <ol className="list-decimal pl-5 space-y-2 text-slate-600">
              <li>Send an email to <a href="mailto:support@sitetrack.online" className="text-[#f97316] underline font-medium">support@sitetrack.online</a></li>
              <li>Use the subject line: <strong>"Account Deletion Request"</strong></li>
              <li>Include the email address associated with your SiteTrack account</li>
            </ol>
            <p className="text-slate-500 text-sm mt-3">We'll confirm receipt within 2 business days. Deletion is completed within 30 days. This removes all company data, projects, employee records, time logs, and invoices permanently.</p>
            <p className="text-slate-500 text-sm mt-2 font-medium">Important: Cancelling your Apple subscription does NOT delete your account. You must request deletion separately via email.</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="font-medium text-slate-800 text-sm">{item.q}</span>
                  <span className="text-slate-400 shrink-0 text-lg">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && (
                  <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function TroubleCard({ icon, title, steps }: { icon: string; title: string; steps: string[] }) {
  return (
    <div className="border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-sm">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-8 px-6 mt-12">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-slate-500 text-sm">© {new Date().getFullYear()} SiteTrack. All rights reserved.</span>
        <nav className="flex gap-6 text-sm">
          <Link href="/privacy"><span className="text-slate-500 hover:text-[#f97316] cursor-pointer">Privacy Policy</span></Link>
          <Link href="/terms"><span className="text-slate-500 hover:text-[#f97316] cursor-pointer">Terms of Use</span></Link>
          <Link href="/support"><span className="text-slate-500 hover:text-[#f97316] cursor-pointer">Support</span></Link>
        </nav>
      </div>
    </footer>
  );
}
