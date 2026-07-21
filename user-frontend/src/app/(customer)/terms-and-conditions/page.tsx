import { Header } from "@/components/Header";

export const metadata = {
  title: "Terms and Conditions | Asali Swad",
  description: "Read the Terms and Conditions of Asali Swad to understand the rules and guidelines for using our website and services.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-page">
      <Header title="Terms & Conditions" subtitle="Rules & Guidelines" />

      <main className="px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-10">

          {/* Hero Banner */}
          <section className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm sm:p-12 border border-slate-100">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-600 font-bold">Legal</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl uppercase">
              AsaliSwad Terms and Conditions
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-500 font-semibold">
              <strong>Last Updated:</strong> June 9, 2026
            </p>
          </section>

          {/* Policy Sections */}
          <section className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-12 space-y-12 border border-slate-100">

            {/* Section 1 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">1</span>
                Acceptance
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                By accessing or using AsaliSwad, you agree to these Terms and Conditions.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">2</span>
                Products
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                AsaliSwad sells food and organic products. Product images are for illustration purposes and actual products may vary slightly.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">3</span>
                Pricing
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                Prices may change without prior notice. Applicable GST and charges will be displayed during checkout.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">4</span>
                Orders
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-slate-600 mb-3">AsaliSwad reserves the right to:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-slate-600">
                  <li>Accept or reject orders</li>
                  <li>Cancel suspicious or fraudulent orders</li>
                  <li>Limit quantities</li>
                </ul>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 5 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">5</span>
                Account Responsibility
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                Users are responsible for maintaining account security and confidentiality.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 6 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">6</span>
                Delivery
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                Delivery times are estimates and may vary due to weather, traffic, holidays, or operational reasons.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 7 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">7</span>
                Intellectual Property
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                All content, logos, trademarks, graphics, product descriptions, and website materials belong to AsaliSwad and may not be copied without permission.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 8 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">8</span>
                Prohibited Activities
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-slate-600 mb-3">Users must not:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-slate-600">
                  <li>Commit fraud</li>
                  <li>Misuse coupons</li>
                  <li>Upload harmful content</li>
                  <li>Attempt unauthorized access</li>
                </ul>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 9 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">9</span>
                Limitation of Liability
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                AsaliSwad shall not be liable for indirect, incidental, or consequential damages arising from use of the platform.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 10 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">10</span>
                Governing Law
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-slate-600">
                These terms shall be governed by the laws of India.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Section 11 */}
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">11</span>
                Contact
              </h2>
              <div className="mt-6 pl-11 space-y-3 text-sm text-slate-600">
                <p><strong className="text-slate-800">Email:</strong> connect.asaliswad2026@gmail.com</p>
                <p><strong className="text-slate-800">Phone:</strong> [Support Number]</p>
              </div>
            </div>

          </section>
        </div>
      </main>

    </div>
  );
}
