import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, TrendingUp, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Use | IPO Deals',
  description: 'Terms of Use and Service Agreement for IPO Deals platform.',
};

export default function TermsPage() {
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
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>Legal Document &bull; Version 1.0</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Terms of Use
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last Updated: September 27, 2026 &bull; Effective Version 1.0
            </p>
          </div>

          {/* Document Content Sections */}
          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>1. Platform Nature & Disclaimer</span>
              </h2>
              <p>
                IPO Deals (&quot;the Platform&quot;) is an independent informational and data aggregation platform designed to assist users in discovering, analyzing, and tracking initial public offerings (IPOs) in the Indian capital markets.
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Important Notice:</strong> IPO Deals is <strong>not</strong> a SEBI-registered investment adviser, stockbroker, merchant banker, stock exchange (NSE/BSE), or official registrar (Link Intime, KFintech, Bigshare). Content published on the Platform does not constitute financial, legal, tax, or investment advice.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Information Accuracy & Third-Party Data
              </h2>
              <p>
                The Platform aggregates IPO information, market indicators, Grey Market Premium (GMP) estimates, subscription rates, financial metrics, and listing prices from publicly available sources and third-party data providers. While we strive to maintain current and accurate data:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Data feeds may experience transmission delays, temporary interruptions, or inaccuracies.</li>
                <li>GMP estimates and subscription tallies reflect unofficial market sentiment and change dynamically.</li>
                <li>Users are strongly advised to independently verify critical information with official offer documents (RHP/DRHP) filed with SEBI and stock exchanges.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Automated Signals & Action Engine
              </h2>
              <p>
                Signals produced by our automated Action Engine (such as &quot;Apply&quot;, &quot;May Apply&quot;, or &quot;Avoid&quot;) are generated solely through algorithmic heuristics evaluating objective metrics. These signals:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Do <strong>not</strong> guarantee IPO allotment or profitable returns.</li>
                <li>Do <strong>not</strong> represent personalized recommendations tailored to individual financial profiles.</li>
                <li>Are provided strictly for educational and informational purposes. You retain full responsibility for all bidding and investment choices.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                4. User Accounts & PAN Security
              </h2>
              <p>
                To utilize account features (such as saving PAN cards for streamlined allotment status checks), users sign in via Google OAuth 2.0:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>You are responsible for maintaining the confidentiality of your Google account credentials.</li>
                <li>PAN details entered into the Platform are encrypted at rest using AES-256-GCM prior to database storage.</li>
                <li>You confirm that any PAN details added belong to you or family members who have authorized you to query allotment records on their behalf.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                5. Prohibited Misuse & Account Suspension
              </h2>
              <p>
                Users agree not to engage in unauthorized data scraping, reverse engineering, rate-limit bypassing, or submitting malicious inputs to the Platform. We reserve the right to suspend or terminate account access for any user violating these provisions or misusing Platform resources.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                6. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted under applicable law, IPO Deals and its developers shall not be liable for any direct, indirect, incidental, consequential, or special damages arising out of or in connection with your use of, or inability to use, the Platform or reliance on any information provided herein.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                7. Versioning & Modifications
              </h2>
              <p>
                We may revise these Terms of Use from time to time. When significant updates occur, users will be presented with a re-consent prompt upon login. Continued access to protected features after version updates constitutes acceptance of the modified terms.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                8. Contact & Legal Enquiries
              </h2>
              <p>
                For questions regarding these Terms of Use or legal inquiries, please contact the Platform administration at:
                <code className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-[#111827] p-2 rounded-xl border border-slate-200 dark:border-white/[0.1] w-fit">
                  support@ipodeals.app
                </code>
              </p>
            </section>

          </div>

          {/* Navigation Links */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-xs">
            <Link
              href="/privacy"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Privacy Policy</span>
              <Shield className="w-3.5 h-3.5" />
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
