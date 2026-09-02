import { Header } from "@/components/Header";

export const metadata = {
  title: "Privacy Policy | ZEBALPHA",
  description: "Read our Privacy Policy to understand how ZEBALPHA collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="ZEBALPHA" subtitle="Privacy Policy ✦" />

      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-10">

          {/* Hero Banner */}
          <section className="overflow-hidden rounded-[2.5rem] bg-zinc-950 p-8 shadow-2xl sm:p-12 border border-zinc-800">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-bold">Legal & Security</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl uppercase">
              ZEBALPHA Privacy Policy
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400 font-semibold">
              <strong>Last Updated:</strong> 2026
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
              Welcome to <strong>ZEBALPHA</strong>. We respect your privacy and are committed to safeguarding your personal data.
            </p>
          </section>

          {/* Policy Sections */}
          <section className="rounded-[2.5rem] bg-zinc-950 p-8 shadow-2xl sm:p-12 space-y-12 border border-zinc-800 text-white">

            {/* Section 1 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">1</span>
                Information We Collect
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-zinc-300 mb-3">We may collect:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-zinc-400">
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

            <hr className="border-zinc-800" />

            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">2</span>
                How We Use Information
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-zinc-300 mb-3">We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-zinc-400">
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

            <hr className="border-zinc-800" />

            {/* Section 3 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">3</span>
                Payment Security
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                AsaliSwad does not store complete credit/debit card information on its servers. Payments are processed through secure payment gateways.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">4</span>
                Data Sharing
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-zinc-300 mb-3">We may share information with:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-zinc-400">
                  <li>Delivery partners</li>
                  <li>Payment gateway providers</li>
                  <li>Analytics providers</li>
                  <li>Government authorities when legally required</li>
                </ul>
                <p className="mt-4 text-sm font-semibold text-white bg-zinc-900 p-4 rounded-xl inline-block border border-zinc-800">
                  We do not sell personal information to third parties.
                </p>
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 5 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">5</span>
                Cookies
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-zinc-300 mb-3">Cookies may be used for:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-zinc-400">
                  <li>Login sessions</li>
                  <li>Shopping cart functionality</li>
                  <li>Analytics</li>
                  <li>Website performance improvement</li>
                </ul>
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 6 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">6</span>
                Data Retention
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                Customer information may be retained for business, tax, legal, and operational purposes.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 7 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">7</span>
                User Rights
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-zinc-300 mb-3">Users may request:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-zinc-400">
                  <li>Access to personal data</li>
                  <li>Correction of inaccurate information</li>
                  <li>Deletion of eligible data</li>
                  <li>Withdrawal of marketing consent</li>
                </ul>
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 8 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">8</span>
                Security
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                Reasonable technical and organizational measures are implemented to protect user information.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 9 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">9</span>
                Children's Privacy
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                Services are intended for users who can legally enter into contracts under applicable laws.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 10 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">10</span>
                Contact
              </h2>
              <div className="mt-6 pl-11 space-y-3 text-sm text-zinc-300">
                <p><strong className="text-white">Business Name:</strong> AsaliSwad</p>
                <p><strong className="text-white">Email:</strong> connect.asaliswad2026@gmail.com</p>
                <p><strong className="text-white">Phone:</strong> Support Desk</p>
                <p><strong className="text-white">Address:</strong> Head Office</p>
              </div>
            </div>

          </section>
        </div>
      </main>

    </div>
  );
}
