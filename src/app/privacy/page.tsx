import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, TrendingUp, Lock, FileText, CheckCircle2, Server, Database } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | IPO Deals',
  description: 'Privacy Policy and Data Protection practices for IPO Deals.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pt-2 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to App</span>
        </Link>
        <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-blue-600 dark:text-blue-400">
          <TrendingUp className="w-4 h-4" />
          <span>IPO DEALS</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl w-full mx-auto my-auto py-4">
        <div className="bg-white dark:bg-[#161f30] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/[0.08] shadow-xl space-y-6">
          
          {/* Title Header */}
          <div className="border-b border-slate-100 dark:border-white/[0.08] pb-5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Privacy & Security &bull; Version 1.0</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last Updated: September 27, 2026 &bull; Effective Version 1.0
            </p>
          </div>

          {/* Document Content Sections */}
          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            
            {/* Introduction */}
            <p>
              IPO Deals (&quot;the Platform&quot;, &quot;we&quot;, or &quot;us&quot;) is committed to respecting user privacy and protecting personal information. This Privacy Policy details what data is collected, how it is secured, and how you can manage your information when using IPO Deals.
            </p>

            {/* Section 1 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>1. Data We Collect & Purpose</span>
              </h2>
              <div className="space-y-3 pt-1">
                
                {/* Data Category A */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] space-y-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Google Identity Account Data</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    When you sign in via Google OAuth 2.0, we receive basic profile information: your primary email address, full name, profile photo URL, and stable Google ID (<code className="font-mono text-[10px]">sub</code>).
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Purpose:</strong> To authenticate your session, create your user profile, and enable multi-device access to your saved records.
                  </p>
                </div>

                {/* Data Category B */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] space-y-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>PAN Details & Encryption</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    If you choose to save Permanent Account Number (PAN) details to simplify allotment status lookups, we store the cardholder name, a masked representation (e.g., <code className="font-mono text-[10px]">ABCDE****F</code>), and the encrypted PAN payload.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Encryption Safeguard:</strong> All full PAN values are encrypted at rest using industry-standard <strong>AES-256-GCM</strong> encryption before database persistence. Plaintext PANs are never exposed in user interface list responses or client-side storage.
                  </p>
                </div>

                {/* Data Category C */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] space-y-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                    <Server className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Session & Device Information</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    We maintain server session records containing a unique random UUID session token, HTTP User-Agent device description (e.g., &quot;Chrome on macOS&quot;), IP address, and activity timestamps.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Purpose:</strong> Session tokens are transmitted exclusively via secure <code className="font-mono text-[10px]">HttpOnly</code> cookies to authorize API requests and allow you to view/revoke logged-in device sessions in Settings.
                  </p>
                </div>

                {/* Data Category D */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] space-y-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                    <Database className="w-3.5 h-3.5 text-amber-500" />
                    <span>Legal Consent Records</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    We record your acceptance timestamp and accepted document versions (<code className="font-mono text-[10px]">terms_version</code> and <code className="font-mono text-[10px]">privacy_version</code>) in PostgreSQL.
                  </p>
                </div>

              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Third-Party Integrations & Data Sharing
              </h2>
              <p>
                IPO Deals integrates with select third-party services to deliver application functionality:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li><strong>Google OAuth 2.0:</strong> Handles user authentication. No user financial data or saved PANs are ever shared back with Google.</li>
                <li><strong>Official IPO Registrars (Link Intime, KFintech, Bigshare):</strong> When you explicitly request an allotment check, your PAN is transmitted directly via SSL/TLS to the official registrar endpoint to query allotment results.</li>
                <li><strong>Data Providers & Utilities (IPO Alerts, IPO Guru, Upstox, Gemini):</strong> Public market stats and AI descriptions are retrieved server-side. No user data is transmitted to these providers.</li>
                <li><strong>Neon PostgreSQL:</strong> Encrypted serverless database hosting user accounts, sessions, and PAN records.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Data Security & Storage Controls
              </h2>
              <p>
                We implement technical and organizational controls to protect your personal information:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li><strong>Encryption in Transit:</strong> All web traffic is encrypted using standard HTTPS / TLS 1.3 encryption.</li>
                <li><strong>Encryption at Rest:</strong> Sensitive identifiers such as PANs are encrypted with AES-256-GCM before storage.</li>
                <li><strong>Session Isolation:</strong> Sessions are validated strictly server-side using secure, HttpOnly, SameSite cookies. No authentication tokens are stored in unencrypted client <code className="font-mono text-[10px]">localStorage</code>.</li>
              </ul>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 italic">
                * Note: While we employ robust security controls, no internet transmission or database storage system can guarantee 100% absolute security against all potential threats.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                4. Data Incident & Breach Procedures
              </h2>
              <p>
                In the event of a verified security incident affecting user data, we will take immediate containment steps, investigate the root cause, remediate vulnerabilities, and inform affected users in accordance with applicable legal requirements under Indian law.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                5. Your Privacy Rights & Data Control
              </h2>
              <p>
                You retain full control over your saved data on IPO Deals:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li><strong>Access & View:</strong> You can view all saved PAN cards (masked) and active device sessions at any time in Settings.</li>
                <li><strong>Edit & Delete:</strong> You can modify cardholder names or delete any saved PAN card directly from the Settings screen.</li>
                <li><strong>Session Revocation:</strong> You can sign out individual device sessions or perform a full account logout at any time.</li>
                <li><strong>Account Deletion Requests:</strong> To request complete deletion of your account profile and all associated data, contact us via email.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                6. Privacy Inquiries & Contact
              </h2>
              <p>
                For privacy inquiries, data deletion requests, or questions about this Privacy Policy, please contact:
                <code className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-[#111827] p-2 rounded-xl border border-slate-200 dark:border-white/[0.1] w-fit">
                  support@ipodeals.app
                </code>
              </p>
            </section>

          </div>

          {/* Navigation Links */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-xs">
            <Link
              href="/terms"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Terms of Use</span>
              <FileText className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Return Home
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto text-center pb-2">
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          IPO Deals &copy; {new Date().getFullYear()} &bull; Real-Time Indian IPO Intelligence
        </p>
      </footer>
    </div>
  );
}
