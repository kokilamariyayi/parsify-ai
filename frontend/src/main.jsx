import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Toaster
      theme="dark"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-gray-900 border border-gray-800 text-gray-100",
        },
      }}
    />
  </React.StrictMode>
);
