export const getApiUrl = () => {
  const raw = import.meta.env.VITE_API_URL || "https://bar.encuentrame.org";
  return raw.replace(/\/+$/, "");
};
