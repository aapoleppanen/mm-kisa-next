"use client";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
  mode?: "inline" | "full-page";
  text?: string;
};

export default function FootballLoader({
  className,
  size = "md",
  mode = "inline",
  text = "Loading matches...",
}: Props) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-20 w-20",
  };

  const ballElement = (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      {/* Bouncing container */}
      <div className={cn("animate-football-bounce", sizeClasses[size])}>
        {/* Spinning soccer ball SVG */}
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full animate-football-spin drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base white sphere */}
          <circle cx="256" cy="256" r="248" fill="#ffffff" stroke="#15803d" strokeWidth="16" />
          
          {/* Hexagon/Pentagon Panels */}
          {/* Center pentagon */}
          <polygon points="256,190 310,230 290,295 222,295 202,230" fill="#1e293b" />
          
          {/* Outer panel line segments */}
          <path
            d="M256,190 L256,80
               M310,230 L410,195
               M290,295 L360,380
               M222,295 L152,380
               M202,230 L102,195"
            stroke="#1e293b"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Top-mid pentagons/lines */}
          <polygon points="256,80 200,40 144,80 164,146 226,146" fill="none" stroke="#1e293b" strokeWidth="12" />
          <polygon points="256,80 312,40 368,80 348,146 286,146" fill="none" stroke="#1e293b" strokeWidth="12" />
          
          {/* Side pentagons */}
          <polygon points="410,195 470,165 496,220 450,270 395,250" fill="#1e293b" />
          <polygon points="102,195 42,165 16,220 62,270 117,250" fill="#1e293b" />
          
          {/* Bottom pentagons */}
          <polygon points="360,380 410,430 360,490 295,470 295,410" fill="#1e293b" stroke="#1e293b" strokeWidth="6" />
          <polygon points="152,380 102,430 152,490 217,470 217,410" fill="#1e293b" stroke="#1e293b" strokeWidth="6" />
          
          {/* Top border patch pentagon */}
          <polygon points="200,40 256,8 312,40 286,80 226,80" fill="#1e293b" stroke="#1e293b" strokeWidth="6" />
        </svg>
      </div>
      
      {/* Shadow */}
      <div 
        className={cn(
          "bg-slate-900/20 rounded-full blur-[2px] mt-1.5 animate-football-shadow",
          size === "sm" ? "h-1 w-4" : size === "md" ? "h-2 w-8" : "h-3 w-14"
        )} 
      />
    </div>
  );

  if (mode === "full-page") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm p-4">
        {ballElement}
        {text && (
          <p className="mt-6 text-sm font-bold text-primary tracking-wider uppercase animate-pulse">
            {text}
          </p>
        )}
      </div>
    );
  }

  return ballElement;
}
