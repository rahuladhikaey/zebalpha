import Link from "next/link";
import { Header } from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | ZEBALPHA",
  description: "Crafting modern streetwear, premium polos, and timeless apparel. Discover the ZEBALPHA story and our commitment to design excellence.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="ZEBALPHA" subtitle="Brand Story ✦" />
      <main className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-12">
          <section className="overflow-hidden rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full bg-white text-black px-4 py-1.5 text-xs font-black uppercase tracking-widest">
                  About ZEBALPHA
                </span>
                <h1 className="mt-6 text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
                  Clothing engineered for those who move different.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-300 font-medium sm:text-lg">
                  ZEBALPHA is born from a desire to merge timeless minimalism with cutting-edge streetwear culture. We source 100% premium combed and Supima cottons, crafting garments with elevated stitches, tailored fits, and uncompromising comfort.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Our Mission</p>
                    <p className="mt-2 text-sm text-neutral-200">Redefine everyday luxury through precision cut-and-sew apparel.</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Our Promise</p>
                    <p className="mt-2 text-sm text-neutral-200">Pure premium fabrics, zero compromise, and seamless 7-day exchanges.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[2rem] bg-neutral-950 border border-neutral-800 p-8 text-white shadow-2xl sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400">The Distinction</p>
                <h2 className="mt-4 text-2xl font-black text-white">Why Zebalpha Stands Out</h2>
                <ul className="mt-6 space-y-3.5 text-sm text-neutral-300">
                  <li className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5">✦ 100% Combed & Supima Cotton weights (220-280 GSM).</li>
                  <li className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5">✦ High-density embroidery and anti-fade reactive dyes.</li>
                  <li className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5">✦ Pan-India express dispatch with real-time order tracking.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Superior Fabrics",
                description: "Breathable, pre-shrunk cotton blends built to withstand hundreds of washes without losing texture.",
              },
              {
                title: "Tailored Architecture",
                description: "Engineered drape with drop shoulders and structured collars that hold their form all day.",
              },
              {
                title: "Ethical Craft",
                description: "Handcrafted in certified facilities with fair labor and sustainable zero-waste packaging.",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-lg transition hover:-translate-y-1 hover:border-white/40">
                <h3 className="text-lg font-black text-white uppercase tracking-wide">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{item.description}</p>
              </article>
            ))}
          </section>

          <section className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">The Journey</p>
                <h2 className="mt-3 text-3xl font-black text-white uppercase sm:text-4xl">
                  Designed in India. Made for the world.
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-300">
                  Whether you're dressing for smart casual meetings or urban streetwear evenings, ZEBALPHA delivers the confidence you deserve.
                </p>
                <Link href="/products" className="mt-7 inline-flex rounded-full bg-white text-black px-7 py-3.5 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-200 active:scale-95 shadow-lg">
                  Explore The Collection →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { value: "100%", label: "Combed Cotton" },
                  { value: "24-48h", label: "Fast Dispatch" },
                  { value: "2026", label: "Latest Drop Collection" },
                  { value: "7 Days", label: "Hassle-free Exchange" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center">
                    <p className="text-3xl font-black text-white">{stat.value}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-400">{stat.label}</p>
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

