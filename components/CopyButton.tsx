"use client";

import { Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = "" }: CopyButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    alert('Reference copied to clipboard');
  };

  return (
    <button 
      onClick={handleCopy}
      className={`text-blue-500 hover:text-blue-700 ${className}`}
      aria-label="Copy to clipboard"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}
