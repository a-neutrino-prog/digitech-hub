import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "./hooks/useToast";
import { ConfirmProvider } from "./hooks/useConfirm";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>
);
