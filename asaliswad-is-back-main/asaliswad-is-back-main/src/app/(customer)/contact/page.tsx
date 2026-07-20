import { Header } from "@/components/Header";
import Image from "next/image";
import qrImage from "./QR.png";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Asali Swad",
  description: "Reach out to our friendly support team for orders, feedback, or wholesale inquiries. Connect with Asali Swad.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Contact Us" subtitle="Get in Touch" />
      <main className="px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-yellow-600">Get in touch</p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  We’re here to help with orders, feedback, or wholesale inquiries.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  Reach out to our friendly support team and we will respond as soon as possible via email.
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-green-600 p-8 text-white shadow-lg sm:p-10">
                <p className="text-sm uppercase tracking-[0.3em] text-yellow-100/90">Contact details</p>
                <div className="mt-8 space-y-6 text-sm leading-7">
                  <div>
                    <p className="font-semibold text-white">Email</p>
                    <a href="mailto:connect.asaliswad2026@gmail.com" className="mt-2 inline-block text-slate-100/90 transition hover:text-white">
                      connect.asaliswad2026@gmail.com
                    </a>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Hours</p>
                    <p className="mt-2 text-slate-100/90">Mon – Sun: 9:00 AM – 11:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-yellow-600">Social Media</p>
                <h2 className="mt-4 text-3xl font-bold text-slate-950">Reach out to us, or visit our store.</h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 flex flex-col justify-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-800">Our product available Visit us</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">123 Market Street, Local City, India</p>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-800">Instagram</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Scan or click to connect and see our latest updates!</p>
                  </div>
                  <a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 block p-2 bg-white rounded-2xl shadow-sm border border-slate-100 transition-transform hover:scale-105"
                  >
                    <Image
                      src={qrImage}
                      alt="Instagram QR Code"
                      width={80}
                      height={80}
                      className="rounded-xl object-contain object-center"
                    />
                  </a>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 flex flex-col justify-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.505 1.12-.816 2.65-1.36 4.35-1.458l.842-3.921c.038-.172.193-.292.368-.292.025 0 .05 0 .076.006l2.853.599a1.265 1.265 0 0 1 1.533-.941zM9.546 12.31c-.694 0-1.256.562-1.256 1.257 0 .694.562 1.256 1.256 1.256.694 0 1.256-.562 1.256-1.256 0-.695-.562-1.257-1.256-1.257zm4.908 0c-.694 0-1.256.562-1.256 1.257 0 .694.562 1.256 1.256 1.256.694 0 1.256-.562 1.256-1.256 0-.695-.562-1.257-1.256-1.257zm-2.454 3.738c-1.393 0-2.617-.417-3.415-1.045-.252-.2-.614-.157-.812.096-.198.252-.157.614.096.812.98.775 2.453 1.282 4.131 1.282 1.678 0 3.151-.507 4.131-1.282.253-.2.294-.56.096-.812-.198-.253-.56-.294-.812-.096-.798.628-2.022 1.045-3.415 1.045z"/>
                    </svg>
                    Reddit
                  </p>
                  <a href="https://www.reddit.com/?feed=home" target="_blank" rel="noopener noreferrer" className="mt-3 text-sm font-medium leading-7 text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 group">
                    Join our community
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 flex flex-col justify-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                  </p>
                  <a href="https://www.linkedin.com/in/asali-swad-6a167940b" target="_blank" rel="noopener noreferrer" className="mt-3 text-sm font-medium leading-7 text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 group">
                    Connect with us
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

