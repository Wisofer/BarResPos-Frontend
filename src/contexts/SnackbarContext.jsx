import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SnackbarStack } from "../components/ui/Snackbar";
import { playSound } from "../utils/sounds";

const SnackbarContext = createContext(null);

let nextId = 1;

export function SnackbarProvider({ children }) {
  const [items, setItems] = useState([]);

  const add = useCallback((message, variant = "success") => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message, variant }]);
    if (variant === "error") playSound("error");
    else playSound("success");
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const success = useCallback((message) => add(message, "success"), [add]);
  const error = useCallback((message) => add(message, "error"), [add]);
  const info = useCallback((message) => add(message, "info"), [add]);

  const value = useMemo(
    () => ({ success, error, info, add }),
    [success, error, info, add]
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <SnackbarStack items={items} onDismiss={dismiss} />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider");
  return ctx;
}
