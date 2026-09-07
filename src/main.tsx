
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./styles/globals.css";


  /**
   * Refuse to run inside someone else's frame.
   *
   * The proper control is a frame-ancestors directive, which only works as a
   * response header - and GitHub Pages serves static files with no way to set
   * one. This is the weaker in-page version: easy for a determined attacker to
   * defeat, but it removes the trivial clickjack where a signed-in landlord is
   * framed and nudged into pressing "Agree and end the tenancy".
   */
  if (window.top !== window.self) {
    try {
      window.top!.location.href = window.self.location.href;
    } catch {
      // A cross-origin parent refuses to be navigated, which is the point.
      document.documentElement.innerHTML =
        '<p style="font:16px system-ui;padding:2rem">Aavas cannot be shown inside another site.</p>';
    }
  }
  createRoot(document.getElementById("root")!).render(<App />);
  