"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Store, 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Bookmark, 
  Code2, 
  ExternalLink 
} from "lucide-react";
import type { BlogPost } from "@/data/blogPosts";

// Brand icons not included in Lucide React
function Twitter({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Linkedin({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function Facebook({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface BlogPostClientProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export function BlogPostClient({ post, relatedPosts }: BlogPostClientProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyCitation = () => {
    const citationText = `<a href="${currentUrl || "https://zebalpha.shop/blogs/" + post.slug}" title="${post.title}">${post.title}</a> - Published on Zebalpha Insights (2026).`;
    navigator.clipboard.writeText(citationText);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${post.title}\n\nRead more here: ${currentUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`${post.title} via @zebalpha`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(currentUrl)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, "_blank");
  };

  return (
    <div className="space-y-12">
      {/* Social Sharing & Citation Bar (Crucial for Off-Page SEO) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-300">
          <Share2 className="h-4 w-4 text-emerald-400" />
          <span>Share & Amplify:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Share on WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5 fill-emerald-400" />
            WhatsApp
          </button>

          <button
            onClick={shareTwitter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Share on X (Twitter)"
          >
            <Twitter className="h-3.5 w-3.5 fill-current" />
            X / Twitter
          </button>

          <button
            onClick={shareLinkedIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/40 text-blue-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Share on LinkedIn"
          >
            <Linkedin className="h-3.5 w-3.5 fill-blue-400" />
            LinkedIn
          </button>

          <button
            onClick={shareFacebook}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Share on Facebook"
          >
            <Facebook className="h-3.5 w-3.5 fill-indigo-400" />
            Facebook
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-black transition-all active:scale-95 cursor-pointer"
            title="Copy URL"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedLink ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* Main Grid: Content + Sticky Sidebar */}
      <div className="grid gap-12 lg:grid-cols-12">
        {/* Left / Main Column: HTML Article Content */}
        <article className="lg:col-span-8 space-y-8">
          {/* Key Takeaways Box (On-Page SEO Feature Snippet Magnet) */}
          <div className="rounded-3xl border border-emerald-500/40 bg-emerald-950/20 p-6 sm:p-8 backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Executive Summary & Key Takeaways
            </h3>
            <ul className="space-y-3">
              {post.keyTakeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-neutral-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* HTML Rendered Content with custom typography styling */}
          <div 
            className="prose prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:uppercase prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-neutral-800 prose-h2:pb-3 prose-h3:text-lg sm:prose-h3:text-xl prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:text-base prose-strong:text-white prose-a:text-emerald-400 prose-a:underline hover:prose-a:text-emerald-300"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* Interactive FAQ Accordion (Boosts FAQPage Rich Snippet) */}
          {post.faqs && post.faqs.length > 0 && (
            <section id="frequently-asked-questions" className="scroll-mt-24 pt-6 space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {post.faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950/80 overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-white hover:text-emerald-300 transition-colors"
                      >
                        <span>{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-emerald-400 shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-neutral-400 shrink-0 ml-2" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-sm text-neutral-300 leading-relaxed border-t border-neutral-900 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Backlink & Attribution Generator Box (Generates Off-Page Backlinks) */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-300">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <span>Reference or Cite This Guide</span>
              </div>
              <button
                onClick={handleCopyCitation}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-white transition-all active:scale-95 cursor-pointer border border-neutral-700"
              >
                {copiedCitation ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedCitation ? "Copied Citation" : "Copy HTML Citation"}
              </button>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Writing an article, business case study, or research paper? Cite this guide with the HTML anchor code above to help fellow entrepreneurs discover 0% commission selling.
            </p>
          </div>

          {/* Author Card (Google E-E-A-T Credibility) */}
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col sm:flex-row items-center gap-5">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-neutral-800 relative border border-neutral-700 shrink-0">
              <Image
                src={post.author.avatar}
                alt={post.author.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Written by Industry Specialist</p>
              <h4 className="text-lg font-black text-white">{post.author.name}</h4>
              <p className="text-xs text-neutral-400">{post.author.role}</p>
              <p className="text-xs text-neutral-300 pt-1 leading-relaxed">
                Dedicated to helping small apparel brands compete with global giants through zero-fee platforms, transparent economics, and cutting-edge streetwear craftsmanship.
              </p>
            </div>
          </div>
        </article>

        {/* Right Sticky Sidebar: Table of Contents & Seller CTA */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Table of Contents Sticky Box */}
          <div className="sticky top-24 space-y-6">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Table of Contents
              </h3>
              <nav className="space-y-2">
                {post.tableOfContents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-xs font-bold text-neutral-300 hover:text-emerald-400 transition-colors py-1.5 border-b border-neutral-900 last:border-0"
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>

            {/* Dedicated Seller Portal Callout Card */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-neutral-950 to-neutral-900 p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-black">
                  <Store className="h-4 w-4 stroke-[2.5]" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Join Zebalpha</p>
                  <p className="text-[11px] text-neutral-400">0% Commission Marketplace</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Keep 100% of sales revenue
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> No hidden fees or listing charges
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Dedicated real-time seller panel
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Rapid 24h onboarding support
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  href="https://seller.zebalpha.shop/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-400 text-black py-3 text-xs font-black uppercase tracking-wider hover:bg-emerald-300 transition-all shadow-md active:scale-95"
                >
                  Start Selling Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/contact"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white py-2.5 text-xs font-bold transition-all"
                >
                  Onboarding Consultation
                </Link>
              </div>
            </div>

            {/* Related Articles Box */}
            {relatedPosts.length > 0 && (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                  Recommended Reading
                </h3>
                <div className="space-y-3">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/blogs/${related.slug}`}
                      className="group block space-y-1 py-2 border-b border-neutral-900 last:border-0"
                    >
                      <span className="text-[10px] font-black uppercase text-emerald-400">
                        {related.category}
                      </span>
                      <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                        {related.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
