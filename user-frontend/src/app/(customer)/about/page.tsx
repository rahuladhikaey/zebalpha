import Link from "next/link";
import { Header } from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Asali Swad",
  description: "Bringing fresh groceries, everyday essentials, and joy to your doorstep. Learn about the Asali Swad story and our commitment to quality.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="About Us" subtitle="Our Story" />
      <main className="px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-12">
          <section className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-700">
                  About Asali Swad
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  Bringing fresh groceries, everyday essentials, and joy to your doorstep.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  Asali Swad began with a simple idea: make grocery shopping fast, transparent, and delightful. We focus on fresh quality, affordable offers, and a friendly experience for every customer.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm uppercase tracking-[0.25em] text-yellow-600">Our mission</p>
                    <p className="mt-3 text-sm text-slate-700">Deliver the best grocery essentials with speed, trust, and care.</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm uppercase tracking-[0.25em] text-yellow-600">Our promise</p>
                    <p className="mt-3 text-sm text-slate-700">Fresh products, strong offers, and a checkout experience that feels effortless.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[2rem] bg-green-600 p-8 text-white shadow-lg sm:p-10">
                <p className="text-sm uppercase tracking-[0.3em] text-yellow-100/90">Why choose us</p>
                <h2 className="mt-5 text-3xl font-semibold">A modern grocery experience built for your day.</h2>
                <ul className="mt-8 space-y-4 text-sm leading-7">
                  <li className="rounded-3xl bg-white/10 p-4">Fast delivery in under 30 minutes for local orders.</li>
                  <li className="rounded-3xl bg-white/10 p-4">Curated categories from dairy and snacks to pantry staples.</li>
                  <li className="rounded-3xl bg-white/10 p-4">Secure checkout and friendly support whenever you need it.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Freshness first",
                description: "We source products with quality checks so every order feels reliable and fresh.",
              },
              {
                title: "Transparent pricing",
                description: "Clear prices, discount reminders, and no surprise fees at checkout.",
              },
              {
                title: "Local convenience",
                description: "Built for neighborhoods that want fast grocery delivery and simple shopping.",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </section>

          <section className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-yellow-600">Our journey</p>
                <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-4xl">
                  Built for families, busy professionals, and everyone who values convenience.
                </h2>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
                  We combine fast delivery, friendly support, and curated grocery categories so you can shop with confidence. From milk and snacks to pantry staples, our goal is to make daily life easier.
                </p>
                <Link href="/contact" className="mt-8 inline-flex rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-green-500">
                  Contact our team
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { value: "99%", label: "Customer satisfaction" },
                  { value: "30 min", label: "Average delivery" },
                  { value: "200+", label: "Fresh products" },
                  { value: "24/7", label: "Support ready" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-center">
                    <p className="text-3xl font-bold text-slate-950">{stat.value}</p>
                    <p className="mt-3 text-sm text-slate-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

