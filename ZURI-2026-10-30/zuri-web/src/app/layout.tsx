import Link from "next/link";
import { Suspense } from "react";

import type { Metadata } from "next";
import "./globals.css";
import "./content-edition.css";
import "./wedding-client.css";
import "./worlds-vivid.css";
import "./conversations-presence.css";
import "./innovation-story.css";
import "./pamoja-network.css";
import "./marketplace-catalogue.css";
import "./pamoja-opportunity.css";
import "./pricing.css";
import "./worlds-immersive.css";
import "./space-life.css";
import "./pamoja-app-overview.css";
import "./zuri-web-app.css";
import "./studio.css";
import "./intent.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";
import ConversationShortcut from "@/components/site/ConversationShortcut";

export const metadata: Metadata = {
  title: {
    default: "ZURI — Discover and Use What Is Good",
    template: "%s | ZURI",
  },
  description:
    "Discover worthwhile technology and stories, use what fits, and find the people, businesses and places around you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Suspense fallback={<header className="global-header"><div className="header-inner"><Link href="/" className="parent-wordmark" aria-label="ZURI home"><BrandMark/></Link><Link href="/contact" className="text-link ml-auto">Get in touch ↗</Link></div></header>}><SiteHeader /></Suspense>
        <Suspense fallback={<main id="main" className="page-wrap section-pad"><p role="status">Loading ZURI…</p></main>}>{children}</Suspense>
        <SiteFooter />
        <Suspense fallback={null}><ConversationShortcut /></Suspense>
      </body>
    </html>
  );
}







