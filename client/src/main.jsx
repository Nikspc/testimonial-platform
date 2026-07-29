import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Submit from "./pages/Submit";
import Dashboard from "./pages/Dashboard";
import Wall from "./pages/Wall";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/submit" replace /> },
  { path: "/submit", element: <Submit /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/wall", element: <Wall /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);