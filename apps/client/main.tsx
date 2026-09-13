import React from "react";
import { createRoot } from "react-dom/client";
import App from "./AppFull";
import { lazy, Suspense } from "react";
const QuestMission = lazy(() => import("./QuestMission"));
import "./game.css";
import "./lead-theme.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {window.location.pathname === '/mission' ? <Suspense fallback={<p>Opening Money Quest…</p>}><QuestMission /></Suspense> : <App />}
  </React.StrictMode>,
);
