import { Link } from "wouter";

export default function Terms() {
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
            <Link href="/support"><span className="text-slate-300 hover:text-white cursor-pointer">Support</span></Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Use</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: May 2025</p>

        <Section title="1. Acceptance of Terms">
          <p>By downloading, installing, or using the SiteTrack mobile application ("App"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, do not use the App.</p>
          <p className="mt-3">These Terms constitute a legally binding agreement between you and SiteTrack ("we", "us", or "our").</p>
        </Section>

        <Section title="2. Description of Service">
          <p>SiteTrack is a multi-tenant SaaS platform for field service and painting business management. Features include project management, time tracking, expense recording, employee management, subcontractor invoicing, and business reporting.</p>
          <p className="mt-3">The App is available for iOS via the Apple App Store. Certain features require an active paid subscription.</p>
        </Section>

        <Section title="3. Account Registration">
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>You must provide accurate, current, and complete information when creating an account</li>
            <li>You are responsible for maintaining the confidentiality of your login credentials</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
            <li>Admin users are responsible for managing their company's employees and data within the App</li>
          </ul>
        </Section>

        <Section title="4. Subscription Plans & Billing">
          <p>SiteTrack offers the following subscription plans, billed monthly through Apple In-App Purchase:</p>
          <div className="mt-4 space-y-3">
            <PlanCard name="Basic" price="$9.90/month" id="com.sitetrack.basic.monthly" limits="Up to 5 employees and 5 active projects" />
            <PlanCard name="Pro" price="$19.90/month" id="com.sitetrack.pro.monthly" limits="Up to 15 employees and 15 active projects, subcontractor invoicing, advanced reports" />
            <PlanCard name="Business" price="$59.90/month" id="com.sitetrack.business.monthly" limits="Unlimited employees and projects, priority support" />
          </div>
          <p className="mt-4">Prices are in Australian Dollars (AUD) unless otherwise indicated by your App Store region.</p>
        </Section>

        <Section title="5. Apple Subscription Auto-Renewal">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm font-medium">
            Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Payment will be charged to your Apple ID account. You can manage or cancel your subscription anytime in Apple ID Settings.
          </div>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-4">
            <li>Your subscription begins immediately upon purchase</li>
            <li>Subscriptions renew automatically at the end of each billing period unless cancelled</li>
            <li>You must cancel at least 24 hours before the renewal date to avoid being charged for the next period</li>
            <li>No refunds are provided for partial subscription periods</li>
            <li>We reserve the right to change pricing with reasonable notice</li>
          </ul>
        </Section>

        <Section title="6. Managing & Cancelling Your Subscription">
          <p>You can manage or cancel your subscription at any time through:</p>
          <ol className="list-decimal pl-5 space-y-2 text-slate-600 mt-3">
            <li>Open <strong>Settings</strong> on your iPhone</li>
            <li>Tap your name → <strong>Subscriptions</strong></li>
            <li>Find <strong>SiteTrack</strong> and tap it</li>
            <li>Select <strong>Cancel Subscription</strong></li>
          </ol>
          <p className="mt-3">Cancellation takes effect at the end of the current billing period. You will retain access to paid features until that date.</p>
        </Section>

        <Section title="7. Restore Purchases">
          <p>If you previously purchased a SiteTrack subscription and need to restore it on a new device or after reinstalling the app:</p>
          <ol className="list-decimal pl-5 space-y-2 text-slate-600 mt-3">
            <li>Open SiteTrack and reach the subscription (paywall) screen</li>
            <li>Tap <strong>"Restore Purchases"</strong></li>
            <li>Your previous purchase will be verified with Apple and restored</li>
          </ol>
          <p className="mt-3">Restore Purchases only works if you are signed in to the same Apple ID used for the original purchase.</p>
        </Section>

        <Section title="8. User Responsibilities">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 mt-3">
            <li>Use the App for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to another company's data</li>
            <li>Reverse engineer, decompile, or disassemble the App</li>
            <li>Upload malicious code or interfere with the App's operation</li>
            <li>Share your account credentials with unauthorized persons</li>
            <li>Use the App to store or transmit defamatory, offensive, or illegal content</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </Section>

        <Section title="9. Intellectual Property">
          <p>All content, features, and functionality of SiteTrack — including but not limited to software, text, graphics, logos, and icons — are owned by SiteTrack and protected by applicable intellectual property laws.</p>
          <p className="mt-3">You retain ownership of data you input into SiteTrack (projects, employee records, invoices, etc.). By using the App, you grant us a limited license to process that data solely to provide the service.</p>
        </Section>

        <Section title="10. Data & Privacy">
          <p>Your use of SiteTrack is also governed by our <Link href="/privacy"><span className="text-[#f97316] underline cursor-pointer">Privacy Policy</span></Link>, which is incorporated into these Terms by reference.</p>
        </Section>

        <Section title="11. Service Availability">
          <p>We aim to maintain 99% uptime but do not guarantee uninterrupted access. We may perform maintenance, updates, or experience outages. We are not liable for any loss arising from service unavailability.</p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>To the maximum extent permitted by applicable law:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 mt-3">
            <li>SiteTrack is provided "as is" without warranties of any kind</li>
            <li>We are not liable for any indirect, incidental, special, or consequential damages</li>
            <li>Our total liability to you shall not exceed the amount you paid to us in the 12 months preceding the claim</li>
            <li>We are not liable for data loss caused by user error, device failure, or force majeure events</li>
          </ul>
        </Section>

        <Section title="13. Termination">
          <p>We may suspend or terminate your account if you violate these Terms or engage in fraudulent activity. Upon termination, your right to use the App ceases immediately. Sections on intellectual property, limitation of liability, and dispute resolution survive termination.</p>
          <p className="mt-3">You may delete your account at any time by contacting <a href="mailto:support@sitetrack.online" className="text-[#f97316] underline">support@sitetrack.online</a>.</p>
        </Section>

        <Section title="14. Changes to Terms">
          <p>We may update these Terms at any time. Material changes will be communicated via the App or email. Continued use after changes constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="15. Governing Law">
          <p>These Terms are governed by the laws of Australia. Any disputes shall be resolved in the courts of Australia, unless otherwise required by applicable consumer protection laws in your jurisdiction.</p>
        </Section>

        <Section title="16. Contact">
          <p>For questions about these Terms:</p>
          <ul className="list-none space-y-1 mt-3 text-slate-600">
            <li>📧 <a href="mailto:support@sitetrack.online" className="text-[#f97316] underline">support@sitetrack.online</a></li>
            <li>🌐 <a href="https://sitetrack.online" className="text-[#f97316] underline">sitetrack.online</a></li>
          </ul>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

function PlanCard({ name, price, id, limits }: { name: string; price: string; id: string; limits: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-slate-900">{name}</span>
        <span className="font-bold text-[#f97316]">{price}</span>
      </div>
      <p className="text-xs text-slate-500 mb-1">Product ID: <code className="bg-slate-100 px-1 rounded">{id}</code></p>
      <p className="text-sm text-slate-600">{limits}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">{title}</h2>
      <div className="text-slate-600 leading-relaxed space-y-2">{children}</div>
    </section>
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
