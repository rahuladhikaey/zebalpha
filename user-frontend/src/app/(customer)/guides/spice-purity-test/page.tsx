import { Header } from "@/components/Header";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Ultimate Spice Purity Test Guide | Asali Swad",
  description: "Learn how to test if your turmeric, chilli powder, and black pepper are 100% pure or adulterated at home. Protect your family with these 5 simple kitchen tests.",
  keywords: ["spice purity test", "how to test turmeric powder", "adulterated spices", "pure organic masala", "chilli powder test", "asali swad guides"],
  openGraph: {
    title: "How to Test Spice Purity at Home",
    description: "5 simple kitchen experiments to test if your turmeric, chilli powder, and coriander are 100% pure.",
    type: "article",
  }
};

export default function SpicePurityGuide() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "The Ultimate Spice Purity Test: How to Spot Adulterated Masalas",
    "author": {
      "@type": "Organization",
      "name": "Asali Swad"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Asali Swad",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.asaliswad.shop/og-image.jpg"
      }
    },
    "datePublished": new Date().toISOString().split('T')[0],
    "description": "Learn 5 simple kitchen experiments to test if your turmeric, chilli powder, and coriander are 100% pure or adulterated with harmful chemicals."
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How can I test if Turmeric powder is pure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Add a teaspoon of turmeric to a glass of warm water. Do not stir. Pure turmeric will settle at the bottom leaving clear water above, while adulterated turmeric (often mixed with metanil yellow) will turn the water cloudy and dark yellow."
        }
      },
      {
        "@type": "Question",
        "name": "How do you check red chilli powder purity?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sprinkle some chilli powder on the surface of a glass of water. Artificial colors will immediately start descending in color streaks, while pure chilli powder will float and not release color immediately."
        }
      }
    ]
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-20 overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      
      <Header title="Purity Guide" subtitle="Expert Knowledge" />
      
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <header className="mb-10 text-center">
          <div className="inline-block bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full mb-6">
            Kitchen Hacks
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            The Ultimate Spice Purity Test: Spotting Fake Masalas
          </h1>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
            <span>By Asali Swad</span>
            <span>•</span>
            <span>5 Min Read</span>
          </div>
        </header>

        <div className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-emerald-600 prose-a:font-bold hover:prose-a:text-emerald-700">
          <p className="lead text-xl text-slate-600 font-medium leading-relaxed">
            Spices are the soul of Indian cooking. But did you know that everyday masalas like Turmeric (Haldi) and Chilli Powder (Lal Mirch) are among the most commonly adulterated food items in the world? 
          </p>

          <p>
            From brick powder in your chilli to chemical dyes like Metanil Yellow in your turmeric, adulterated spices not only ruin the flavor of your food but pose serious long-term health risks. At <Link href="/">Asali Swad</Link>, we believe in 100% pure, organic sourcing. Here is our definitive guide on how you can test your pantry spices right now using simple water tests.
          </p>

          <hr className="my-10 border-slate-100" />

          <h2>1. The Turmeric (Haldi) Water Test</h2>
          <p>Turmeric is often adulterated with chalk powder or a toxic chemical dye called Metanil Yellow to give it that bright, artificial glow.</p>
          <div className="bg-emerald-50 rounded-2xl p-6 my-6 border border-emerald-100">
            <h3 className="text-emerald-800 mt-0">How to test:</h3>
            <ol className="text-emerald-900/80 mb-0">
              <li>Take a transparent glass of warm water.</li>
              <li>Drop one teaspoon of Turmeric powder onto the surface of the water. <strong>Do not stir it.</strong></li>
              <li>Leave it undisturbed for 20 minutes.</li>
            </ol>
            <p className="mt-4 mb-0 font-bold text-emerald-900">
              ✅ Pure Result: The turmeric will naturally settle at the bottom of the glass, leaving the water above relatively clear.<br/><br/>
              ❌ Fake Result: The water will immediately turn cloudy and a dark, unnatural yellow, indicating water-soluble artificial dyes.
            </p>
          </div>

          <h2>2. The Red Chilli Powder Float Test</h2>
          <p>To increase bulk and enhance the red color, dishonest suppliers mix red chilli powder with brick powder, sand, or water-soluble artificial colors.</p>
          <div className="bg-orange-50 rounded-2xl p-6 my-6 border border-orange-100">
            <h3 className="text-orange-800 mt-0">How to test:</h3>
            <ol className="text-orange-900/80 mb-0">
              <li>Fill a glass with normal room-temperature water.</li>
              <li>Sprinkle a pinch of chilli powder on the surface.</li>
            </ol>
            <p className="mt-4 mb-0 font-bold text-orange-900">
              ✅ Pure Result: The powder will float on the surface, and no color will immediately leak into the water.<br/><br/>
              ❌ Fake Result: You will see a distinct red colored streak descending into the water almost instantly, proving artificial dyes have been added. If it sinks to the bottom rapidly, it may contain brick powder or grit.
            </p>
          </div>

          <h2>Why Purity Matters</h2>
          <p>
            When you buy from local unbranded vendors, you are playing roulette with your health. Authentic Indian spices don't just provide heat—they provide medicinal benefits, essential oils, and complex flavor profiles. 
          </p>

          {/* Call to Action */}
          <div className="mt-12 bg-slate-900 rounded-[2rem] p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl transform rotate-12">🌶️</div>
            <h3 className="text-white text-2xl font-black mt-0">Don't compromise on your family's health.</h3>
            <p className="text-slate-300 mt-3 font-medium max-w-lg mx-auto">
              Skip the adulteration anxiety. Shop our hand-ground, 100% organic, farm-sourced spices.
            </p>
            <Link href="/products?category=3" className="mt-8 inline-flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest text-sm px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
              Shop Pure Masalas →
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
