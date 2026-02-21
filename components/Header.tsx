"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Header() {
  const pathName = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Determine if we are on the landing page
  const isHome = pathName === "/";

  // Handle scroll detection for dynamic glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed top-0 w-full h-16 flex items-center px-6 transition-all duration-300 z-50 justify-between ${
        scrolled
          ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shadow-sm border-b border-zinc-200 dark:border-zinc-800"
          : isHome 
            ? "bg-transparent" 
            : "bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <Link href="/">
        <motion.div 
          className="flex items-center space-x-2 group cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
             animate={{ scale: [1, 1.1, 1] }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <HeartPulse className="w-6 h-6 text-primary mr-1" />
          </motion.div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-zinc-600 dark:from-primary dark:to-zinc-400">
            Smart EMR
          </span>
        </motion.div>
      </Link>

      <div className="flex items-center space-x-4">
        <SignedIn>
          <div className="hidden md:flex items-center space-x-2 mr-4">
            {[
              { name: "Dashboard", path: "/dashboard" },
              { name: "Triage", path: "/triage" },
              { name: "Consultation", path: "/consultation" },
              { name: "Documents", path: "/documents" },
              { name: "Review", path: "/review" },
            ].map((tab) => (
              <motion.div key={tab.path} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href={tab.path}>
                  <Button 
                    variant="ghost" 
                    className={`text-sm font-medium transition-colors ${
                      pathName === tab.path 
                        ? "text-primary bg-primary/10" 
                        : "text-zinc-600 dark:text-zinc-300 hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {tab.name}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <UserButton />
          </motion.div>
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-md hover:shadow-lg transition-all border-0">
                Login
              </Button>
            </motion.div>
          </SignInButton>
        </SignedOut>
      </div>
    </motion.header>
  );
}
