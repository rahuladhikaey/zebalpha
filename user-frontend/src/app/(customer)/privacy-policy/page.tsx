import { Header } from "@/components/Header";

export const metadata = {
  title: "Privacy Policy | Asali Swad",
  description: "Read our Privacy Policy to understand how Asali Swad collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-page">
      <Header title="Privacy Policy" subtitle="Your Privacy, Our Commitment" />

      <main className="px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-10">

          {/* Hero Banner */}
          <section className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm sm:p-12 border border-slate-100">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-600 font-bold">Legal</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl uppercase">
              AsaliSwad Privacy Policy
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-500 font-semibold">
              <strong>Last Updated:</strong> June 9, 2026
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              Welcome to <strong>AsaliSwad</strong>. We respect your privacy and are committed to protecting your personal information.
            </p>
          </section>

          {/* Policy Sections */}
          <section className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-12 space-y-12 border border-slate-100">

            {/* Section 1 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">1</span>
                Information We Collect
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-slate-600 mb-3">We may collect:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-slate-600">
                  <li>Full Name</li>
                  <li>Mobile Number</li>
                  <li>Email Address</li>
                  <li>Delivery Address</li>
                  <li>Billing Address</li>
                  <li>Order History</li>
                  <li>Payment Information (processed securely through third-party payment providers)</li>
                  <li>Device Information</li>
                  <li>Browser Information</li>
                  <li>IP Address</li>
                  <li>Cookies and Analytics Data</li>
                </ul>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">2</span>
                How We Use Information
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-slate-600 mb-3">We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-slate-600">
                  <li>Process and deliver orders</li>
                  <li>Provide customer support</li>
                  <li>Improve our website and services</li>
                  <li>Send order updates</li>
                  <li>Prevent fraud and abuse</li>
                  <li>Comply with legal requirements</li>
                  <li>Provide promotional offers (with consent where required)</li>
                </ul>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">3</span>
                Payment Security
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                AsaliSwad does not store complete credit/debit card information on its servers. Payments are processed through secure payment gateways.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">4</span>
                Data Sharing
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-slate-600 mb-3">We may share information with:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-slate-600">
                  <li>Delivery partners</li>
                  <li>Payment gateway providers</li>
                  <li>Analytics providers</li>
                  <li>Government authorities when legally required</li>
                </ul>
                <p className="mt-4 text-sm font-semibold text-slate-800 bg-emerald-50 p-4 rounded-xl inline-block border border-emerald-100">
                  We do not sell personal information to third parties.
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 5 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">5</span>
                Cookies
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-slate-600 mb-3">Cookies may be used for:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-slate-600">
                  <li>Login sessions</li>
                  <li>Shopping cart functionality</li>
                  <li>Analytics</li>
                  <li>Website performance improvement</li>
                </ul>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 6 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">6</span>
                Data Retention
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                Customer information may be retained for business, tax, legal, and operational purposes.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 7 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">7</span>
                User Rights
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-slate-600 mb-3">Users may request:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-slate-600">
                  <li>Access to personal data</li>
                  <li>Correction of inaccurate information</li>
                  <li>Deletion of eligible data</li>
                  <li>Withdrawal of marketing consent</li>
                </ul>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 8 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">8</span>
                Security
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                Reasonable technical and organizational measures are implemented to protect user information.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 9 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">9</span>
                Children's Privacy
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                Services are intended for users who can legally enter into contracts under applicable laws.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 10 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">10</span>
                Contact
              </h2>
              <div className="mt-6 pl-11 space-y-3 text-sm text-slate-600">
                <p><strong className="text-slate-800">Business Name:</strong> AsaliSwad</p>
                <p><strong className="text-slate-800">Email:</strong> connect.asaliswad2026@gmail.com</p>
                <p><strong className="text-slate-800">Phone:</strong> [Support Number]</p>
                <p><strong className="text-slate-800">Address:</strong> [Business Address]</p>
              </div>
            </div>

          </section>
        </div>
      </main>

    </div>
  );
}
