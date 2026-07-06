import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const apiUrl = rawApiUrl?.trim();
const normalizedApiUrl = apiUrl ? apiUrl.replace(/\/\/+$/, "") : undefined;
const resolvedApiUrl = normalizedApiUrl?.match(/^https?:\/\//i)
  ? normalizedApiUrl
  : normalizedApiUrl
    ? `https://${normalizedApiUrl}`
    : undefined;

console.log("VITE_API_URL:", rawApiUrl);
console.log("Resolved API base URL:", resolvedApiUrl);

if (!resolvedApiUrl) {
  console.warn(
    "VITE_API_URL is not set or invalid at build time. Requests will remain relative.",
  );
}

if (resolvedApiUrl) {
  setBaseUrl(resolvedApiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
//new
