import React from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import path from "path";

export default function Header() {
  const pathName = usePathname();

  const isHome = pathName === "/";

  return (
    <div
      className={`w-full h-16 flex items-center px-4 shadow-md justify-between ${isHome ? "bg-blue-50" : "bg-white border-b border-blue-50"}`}
    >
      <Link href="/" className="flex items-center space-x-2">
        <Shield className="w-6 h-6 text-blue-300 mr-2" />
        <span className="text-xl font-semibold">ExpenseHub </span>
      </Link>
      <div className="flex items-center space-x-4">
        <SignedIn>
          <Link href="/receipts">
            <Button variant={"outline"}>My Receipts</Button>
          </Link>

          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button>Login</Button>
          </SignInButton>
        </SignedOut>
      </div>
    </div>
  );
}
