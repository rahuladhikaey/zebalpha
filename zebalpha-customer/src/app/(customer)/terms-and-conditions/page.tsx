import { Header } from "@/components/Header";

export const metadata = {
  title: "Terms and Conditions | ZEBALPHA",
  description: "Read the Terms and Conditions of ZEBALPHA to understand the rules and guidelines for using our website and services.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="ZEBALPHA" subtitle="Terms & Conditions ✦" />

      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-10">

          {/* Hero Banner */}
          <section className="overflow-hidden rounded-[2.5rem] bg-zinc-950 p-8 shadow-2xl sm:p-12 border border-zinc-800">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-bold">Legal & Guidelines</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl uppercase">
              ZEBALPHA Terms & Conditions
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400 font-semibold">
              <strong>Last Updated:</strong> 2026
            </p>
          </section>

          {/* Policy Sections */}
          <section className="rounded-[2.5rem] bg-zinc-950 p-8 shadow-2xl sm:p-12 space-y-12 border border-zinc-800 text-white">

            {/* Section 1 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">1</span>
                Acceptance
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                By accessing or using AsaliSwad, you agree to these Terms and Conditions.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">2</span>
                Products
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                AsaliSwad sells food and organic products. Product images are for illustration purposes and actual products may vary slightly.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 3 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">3</span>
                Pricing
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                Prices may change without prior notice. Applicable GST and charges will be displayed during checkout.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">4</span>
                Orders
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-zinc-300 mb-3">AsaliSwad reserves the right to:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-zinc-400">
                  <li>Accept or reject orders</li>
                  <li>Cancel suspicious or fraudulent orders</li>
                  <li>Limit quantities</li>
                </ul>
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 5 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">5</span>
                Account Responsibility
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                Users are responsible for maintaining account security and confidentiality.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 6 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">6</span>
                Delivery
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                Delivery times are estimates and may vary due to weather, traffic, holidays, or operational reasons.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 7 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">7</span>
                Intellectual Property
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                All content, logos, trademarks, graphics, product descriptions, and website materials belong to AsaliSwad and may not be copied without permission.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 8 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">8</span>
                Prohibited Activities
              </h2>
              <div className="mt-6 pl-11">
                <p className="text-sm text-zinc-300 mb-3">Users must not:</p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-7 text-zinc-400">
                  <li>Commit fraud</li>
                  <li>Misuse coupons</li>
                  <li>Upload harmful content</li>
                  <li>Attempt unauthorized access</li>
                </ul>
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 9 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">9</span>
                Limitation of Liability
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                AsaliSwad shall not be liable for indirect, incidental, or consequential damages arising from use of the platform.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 10 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">10</span>
                Governing Law
              </h2>
              <p className="mt-4 pl-11 text-sm leading-7 text-zinc-300">
                These terms shall be governed by the laws of India.
              </p>
            </div>

            <hr className="border-zinc-800" />

            {/* Section 11 */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">11</span>
                Contact
              </h2>
              <div className="mt-6 pl-11 space-y-3 text-sm text-zinc-300">
                <p><strong className="text-white">Email:</strong> connect.asaliswad2026@gmail.com</p>
                <p><strong className="text-white">Phone:</strong> Support Desk</p>
              </div>
            </div>

          </section>
        </div>
      </main>

    </div>
  );
}
