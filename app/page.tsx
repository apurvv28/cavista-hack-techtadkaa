"use client";

import { HeroSection } from "./components/landing/HeroSection";
import { FeaturesList } from "./components/landing/FeaturesList";
import { TestimonialSection } from "./components/landing/TestimonialSection";
import { Footer } from "./components/landing/Footer";
import ChatbotPopup from "./components/landing/chatbot";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black font-sans selection:bg-primary/20 selection:text-zinc-900">
      <HeroSection />
      <FeaturesList />
      <TestimonialSection />
      <ChatbotPopup />
      <Footer />
    </main>
  );
}
