import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "./hooks/useToast";
import { ConfirmProvider } from "./hooks/useConfirm";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
