"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PaymentReminder({
  mobilepayNumber,
  initialHasPaid,
}: {
  mobilepayNumber: string;
  initialHasPaid: boolean;
}) {
  const [open, setOpen] = useState(!initialHasPaid);
  const [hasPaid, setHasPaid] = useState(initialHasPaid);
  const [saving, setSaving] = useState(false);

  const toggle = async (checked: boolean) => {
    setSaving(true);
    const res = await fetch("/api/user/payment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasPaid: checked }),
    });
    setSaving(false);
    if (res.ok) {
      setHasPaid(checked);
      if (checked) toast.success("Thanks! Payment noted.");
    } else {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-2">
      <div className="bg-white/90 backdrop-blur-md border border-primary/20 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
          aria-expanded={open}
        >
          <span className="text-base leading-none">💳</span>
          <span className="flex-1 text-xs font-semibold text-slate-700 leading-snug">
            How to pay
            <span className="hidden sm:inline text-slate-400 font-normal">
              {" "}
              — MobilePay {mobilepayNumber}
            </span>
          </span>
          {hasPaid && (
            <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mr-1">
              Paid ✓
            </span>
          )}
          <span
            className={cn(
              "text-[10px] text-slate-400 transition-transform duration-150",
              open && "rotate-180",
            )}
          >
            ▼
          </span>
        </button>
        {open && (
          <div className="px-4 pb-3 pt-0 space-y-2.5">
            <ul className="space-y-1">
              <li className="text-xs text-slate-600 flex gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>MobilePay</strong>{" "}
                  <span className="font-black text-primary">
                    {mobilepayNumber}
                  </span>
                </span>
              </li>
              <li className="text-xs text-slate-600 flex gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  Add your name and <strong>username</strong> to the message.
                </span>
              </li>
            </ul>
            <label
              className={cn(
                "flex items-center gap-2.5 cursor-pointer select-none",
                saving && "opacity-50",
              )}
            >
              <input
                type="checkbox"
                checked={hasPaid}
                disabled={saving}
                onChange={(e) => toggle(e.target.checked)}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">
                I&apos;ve sent the payment
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
