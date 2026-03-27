import { useState, useCallback } from "react";

export function useLocalState(initialItems, key = null) {
  const [items, setItems] = useState(initialItems);

  const addItem = useCallback(
    (item) => {
      setItems((prev) => [...prev, { ...item, id: String(Date.now()) }]);
    },
    []
  );

  const updateItem = useCallback((id, updates) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return [items, setItems, { addItem, updateItem, removeItem }];
}
