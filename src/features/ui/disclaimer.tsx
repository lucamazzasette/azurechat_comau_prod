"use client";

export const Disclaimer = () => {
  return (
    <div className="text-xs text-muted-foreground text-center p-2 bg-background/50">
      COMAU AICO generated content may be inaccurate.{" "}
      <a 
        href="https://drive.google.com/file/d/1JrF7e5KG07M3VPWiIn2_dEKNYP_m3Tsm/view" 
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground transition-colors"
      >
        Referred Policy
      </a>
      . Model-Route Architecture (Multi-LLM). Last update varies by model
    </div>
  );
};
