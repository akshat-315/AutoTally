import { useEffect, useState } from "react";

type Phase = "typing" | "cursor" | "logo" | "fade-out";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      i++;
      setTyped("auto".slice(0, i));
      if (i >= 4) clearInterval(typeInterval);
    }, 180);

    const cursorTimer = setTimeout(() => setPhase("cursor"), 900);
    const logoTimer = setTimeout(() => setPhase("logo"), 1600);
    const fadeTimer = setTimeout(() => setPhase("fade-out"), 4500);
    const doneTimer = setTimeout(onDone, 5000);

    return () => {
      clearInterval(typeInterval);
      clearTimeout(cursorTimer);
      clearTimeout(logoTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const showText = phase === "typing" || phase === "cursor";
  const showLogo = phase === "logo" || phase === "fade-out";

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        phase === "fade-out" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* "auto" typewriter text */}
      <div
        className="flex items-center"
        style={{
          opacity: showText ? 1 : 0,
          transform: showText ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          position: showLogo ? "absolute" : "relative",
        }}
      >
        <span className="font-mono text-lg tracking-[0.3em] text-foreground/80">
          {typed}
        </span>
        {(phase === "typing" || phase === "cursor") && (
          <span
            className="w-[1.5px] h-5 bg-foreground/60 ml-[2px]"
            style={{
              animation: typed.length >= 4 ? "cursor-blink 0.5s step-end infinite" : "none",
            }}
          />
        )}
      </div>

      {/* Logo appears */}
      {showLogo && (
        <img
          src="/logo.png"
          alt="Tally"
          className="object-contain dark:invert"
          style={{
            width: 128,
            height: 128,
            animation: "splash-spin 2.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          }}
        />
      )}
    </div>
  );
}
