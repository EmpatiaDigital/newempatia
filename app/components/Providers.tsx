// components/Providers.tsx
"use client";

import { AuthProvider } from "../context/AuthContext";
import AppClientInitializer from "../AppClientInitializer";
import ErrorBoundary from "./Error404";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppClientInitializer>
          {children}
        </AppClientInitializer>
      </AuthProvider>
    </ErrorBoundary>
  );
}
