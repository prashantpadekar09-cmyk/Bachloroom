import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?:
                | "signin_with"
                | "signup_with"
                | "continue_with"
                | "signin";
              width?: number;
              logo_alignment?: "left" | "center";
            }
          ) => void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      if (window.google) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google script")), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  onCredential: (credential: string) => Promise<void> | void;
  onError: (message: string) => void;
};

export default function GoogleAuthButton({ mode, onCredential, onError }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) {
          return;
        }

        containerRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (!credential) {
              onError("Google authentication failed. Please try again.");
              return;
            }
            void onCredential(credential);
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: mode === "signup" ? "signup_with" : "signin_with",
          width: 320,
          logo_alignment: "left",
        });
        setIsReady(true);
      })
      .catch(() => {
        onError("Unable to load Google authentication right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [mode, onCredential, onError]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <p className="text-center text-xs text-gray-500">
        Google sign-in is unavailable until `VITE_GOOGLE_CLIENT_ID` is configured.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex justify-center" />
      {!isReady && <p className="text-center text-xs text-gray-500">Loading Google authentication...</p>}
    </div>
  );
}
