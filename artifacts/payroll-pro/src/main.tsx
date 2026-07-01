import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
console.log("VITE_API_URL:", apiUrl);
if (!apiUrl) {
  console.warn(
    "VITE_API_URL is not set at build time. Requests will remain relative.",
  );
}
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
//new
