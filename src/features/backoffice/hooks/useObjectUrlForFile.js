import { useEffect, useState } from "react";

/**
 * Genera una object URL para un `File` y la revoca al cambiar o desmontar.
 * @param {File | null | undefined} file
 * @returns {string | null}
 */
export function useObjectUrlForFile(file) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [file]);

  return url;
}
