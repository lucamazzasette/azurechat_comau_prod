"use client";

export const Disclaimer = () => {
  return (
    <div className="text-xs text-muted-foreground text-center p-2 bg-background/50">
      COMAU AICO generated content may be inaccurate.{" "}
      <a 
        href="https://drive.google.com/file/d/1OXkt4Z9hVoy4rXGFBOhzR9e0LJers5fJ/view" 
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground transition-colors"
      >
        Referred Policy
      </a>
      . AICO Model Last update October 2023
    </div>
  );
};
