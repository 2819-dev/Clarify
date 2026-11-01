"use client";

import { createContext, useContext } from "react";

const ModerationContext = createContext(false);

export function ModerationProvider({
  canModerate,
  children,
}: {
  canModerate: boolean;
  children: React.ReactNode;
}) {
  return (
    <ModerationContext.Provider value={canModerate}>
      {children}
    </ModerationContext.Provider>
  );
}

export function useCanModerate() {
  return useContext(ModerationContext);
}
