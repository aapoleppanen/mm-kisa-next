import { cn } from "@/lib/utils";

// Short team code, e.g. "Finland" → "FIN", "South Korea" → "SOU".
function teamAbbr(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  return (letters || name).slice(0, 3).toUpperCase();
}

function Flag({ crest, alt }: { crest: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={crest}
      alt={alt}
      className="inline-block h-3 w-[18px] object-contain rounded-[2px]"
      loading="lazy"
      decoding="async"
    />
  );
}

export type PickBadgeProps = {
  predHome?: number | null;
  predAway?: number | null;
  pickedResult?: string | null;
  homeName: string;
  awayName: string;
  homeCrest: string;
  awayCrest: string;
  locked?: boolean;
  none?: boolean;
  className?: string;
};

// Grey pick pill shared between the leaderboard and comment mentions. Renders
// flags around the prediction: "<flag> 1 - 2 <flag>" for scorelines, the picked
// side's flag + code for outcome picks.
export default function PickBadge({
  predHome,
  predAway,
  pickedResult,
  homeName,
  awayName,
  homeCrest,
  awayCrest,
  locked,
  none,
  className,
}: PickBadgeProps) {
  let content: React.ReactNode;
  if (locked) {
    content = <span>🔒</span>;
  } else if (none) {
    content = <span>—</span>;
  } else if (predHome != null && predAway != null) {
    content = (
      <>
        <Flag crest={homeCrest} alt={homeName} />
        <span>
          {predHome} - {predAway}
        </span>
        <Flag crest={awayCrest} alt={awayName} />
      </>
    );
  } else if (pickedResult === "DRAW") {
    content = (
      <>
        <Flag crest={homeCrest} alt={homeName} />
        <span>X</span>
        <Flag crest={awayCrest} alt={awayName} />
      </>
    );
  } else if (pickedResult === "HOME_TEAM") {
    content = (
      <>
        <Flag crest={homeCrest} alt={homeName} />
        <span>{teamAbbr(homeName)}</span>
      </>
    );
  } else if (pickedResult === "AWAY_TEAM") {
    content = (
      <>
        <Flag crest={awayCrest} alt={awayName} />
        <span>{teamAbbr(awayName)}</span>
      </>
    );
  } else {
    content = <span>—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-slate-100 text-slate-500 font-bold font-mono text-[10px] px-1.5 py-0.5 rounded align-middle",
        className
      )}
    >
      {content}
    </span>
  );
}
