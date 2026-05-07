import { Link } from "wouter";

export default function Privacy() {
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
            <Link href="/terms"><span className="text-slate-300 hover:text-white cursor-pointer">Terms</span></Link>
            <Link href="/support"><span className="text-slate-300 hover:text-white cursor-pointer">Support</span></Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: May 2025</p>

        <Section title="1. Introduction">
          <p>SiteTrack ("we", "us", or "our") is a multi-tenant SaaS platform designed for field service and painting business management. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the SiteTrack mobile application and related services.</p>
          <p className="mt-3">By using SiteTrack, you agree to the practices described in this policy. If you do not agree, please do not use our app.</p>
        </Section>

        <Section title="2. Information We Collect">
          <h3 className="font-semibold text-slate-800 mt-4 mb-2">Account Data</h3>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Full name and email address</li>
            <li>Company name and business details</li>
            <li>Role (Admin or Employee)</li>
            <li>Profile photo (optional, stored as provided)</li>
            <li>Phone number and position (optional)</li>
          </ul>

          <h3 className="font-semibold text-slate-800 mt-4 mb-2">Business Data</h3>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Project details: names, addresses, client information, status, paint colors, notes</li>
            <li>Time logs: clock-in/clock-out records, hours worked per project</li>
            <li>Expense records: category, description, amounts, dates</li>
            <li>Employee notes and project photos</li>
            <li>Subcontractor invoice data: ABN, bank details, invoice numbers, line items, payment terms</li>
            <li>Company branding: logo, primary/secondary colors</li>
          </ul>

          <h3 className="font-semibold text-slate-800 mt-4 mb-2">Device & Technical Data</h3>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Expo push notification token (for future notifications, stored but not currently used for marketing)</li>
            <li>Device type and operating system (inferred from app usage)</li>
          </ul>
        </Section>

        <Section title="3. Apple In-App Purchase & Subscription Data">
          <p>SiteTrack uses Apple In-App Purchases (via RevenueCat) to manage subscriptions. We offer the following plans:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 mt-3">
            <li><strong>Basic</strong> — $9.90/month (com.sitetrack.basic.monthly)</li>
            <li><strong>Pro</strong> — $19.90/month (com.sitetrack.pro.monthly)</li>
            <li><strong>Business</strong> — $59.90/month (com.sitetrack.business.monthly)</li>
          </ul>
          <p className="mt-3"><strong>We do not store or process any payment card information directly.</strong> All payment processing is handled exclusively by Apple through your Apple ID. SiteTrack only receives a subscription status token from RevenueCat to verify entitlement.</p>
          <p className="mt-3">RevenueCat may collect anonymised purchase analytics. Please refer to <a href="https://www.revenuecat.com/privacy" className="text-[#f97316] underline" target="_blank" rel="noopener noreferrer">RevenueCat's Privacy Policy</a> and <a href="https://www.apple.com/legal/privacy/" className="text-[#f97316] underline" target="_blank" rel="noopener noreferrer">Apple's Privacy Policy</a> for details on their data handling.</p>
          <p className="mt-3 font-medium text-slate-700">Subscription auto-renewal disclosure: Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Payment is charged to your Apple ID account. You can manage or cancel your subscription anytime in Apple ID Settings.</p>
        </Section>

        <Section title="4. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>To provide and operate the SiteTrack application and all its features</li>
            <li>To authenticate users and enforce multi-tenant data isolation (each company's data is strictly separated)</li>
            <li>To generate subcontractor invoices and business reports</li>
            <li>To verify subscription status and unlock features based on your plan</li>
            <li>To improve performance, fix bugs, and develop new features</li>
            <li>To respond to support requests</li>
          </ul>
          <p className="mt-3">We do not sell your personal data. We do not use your data for advertising.</p>
        </Section>

        <Section title="5. Multi-Tenant Data Isolation">
          <p>SiteTrack is built as a multi-tenant platform. Each company account operates in complete isolation. Admins and employees of one company cannot access data belonging to another company. All database queries are scoped to a <code className="bg-slate-100 px-1 rounded text-sm">companyId</code> to enforce this separation at the data layer.</p>
        </Section>

        <Section title="6. Data Sharing">
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share data with:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 mt-3">
            <li><strong>RevenueCat</strong> — for subscription management and entitlement verification</li>
            <li><strong>Apple</strong> — for payment processing via App Store</li>
            <li><strong>Hosting providers</strong> — for infrastructure (servers are protected by industry-standard security)</li>
            <li><strong>Law enforcement</strong> — only if required by valid legal process</li>
          </ul>
        </Section>

        <Section title="7. Data Security">
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Passwords are hashed using bcryptjs (12 rounds) and never stored in plaintext</li>
            <li>All API communication uses HTTPS/TLS encryption</li>
            <li>Authentication uses JSON Web Tokens with a 30-day expiry</li>
            <li>Database connections use SSL where applicable</li>
            <li>No payment card data is ever stored on our servers</li>
            <li>Role-based access control (RBAC): employees cannot access admin-only data; financial fields are stripped from employee API responses</li>
          </ul>
        </Section>

        <Section title="8. Data Retention">
          <p>We retain your data for as long as your account is active. If you request account deletion, we will delete your personal data and all associated company data within 30 days, except where retention is required by law.</p>
        </Section>

        <Section title="9. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 mt-3">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Object to or restrict certain processing</li>
            <li>Data portability</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:support@sitetrack.online" className="text-[#f97316] underline">support@sitetrack.online</a>.</p>
        </Section>

        <Section title="10. Account Deletion">
          <p>You can request deletion of your account and all associated data by:</p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-600 mt-3">
            <li>Emailing <a href="mailto:support@sitetrack.online" className="text-[#f97316] underline">support@sitetrack.online</a> with the subject line "Account Deletion Request"</li>
            <li>Including the email address associated with your account</li>
          </ol>
          <p className="mt-3">We will confirm receipt within 2 business days and complete deletion within 30 days. Note: cancelling your Apple subscription does not automatically delete your account data — you must submit a deletion request separately.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>SiteTrack is not intended for users under 13 years of age. We do not knowingly collect personal information from children.</p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify users of material changes via the app or email. Continued use of SiteTrack after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="13. Contact Us">
          <p>For privacy-related questions or requests:</p>
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
