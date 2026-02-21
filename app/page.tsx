"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";

export default function Home() {
  return (
    <div className="">Page</div>
    // <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
    //   <Authenticated>
    //     <div className="flex flex-col items-center gap-4">
    //       <p className="text-xl font-semibold">✅ Logged in successfully</p>
    //       <UserButton afterSignOutUrl="/" />
    //     </div>
    //   </Authenticated>

    //   <Unauthenticated>
    //     <div className="flex flex-col items-center gap-4">
    //       <h1 className="text-2xl font-bold">Welcome</h1>

    //       <SignInButton mode="modal">
    //         <button className="rounded-md bg-black px-6 py-2 text-white">
    //           Login
    //         </button>
    //       </SignInButton>

    //       <SignUpButton mode="modal">
    //         <button className="rounded-md border px-6 py-2">Sign Up</button>
    //       </SignUpButton>
    //     </div>
    //   </Unauthenticated>
    // </div>
  );
}
