import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full space-y-6">
      <SearchX className="w-16 h-16 text-gray-400" />
      <h1 className="text-3xl font-semibold">404 - Page Not Found</h1>
      <p className="text-gray-600">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link href="/">
        <Button variant="outline" className="flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back Home</span>
        </Button>
      </Link>
    </div>
  );
}
