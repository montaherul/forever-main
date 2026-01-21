import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Add from "./pages/Add.jsx";
import List from "./pages/List.jsx";
import Orders from "./pages/Orders.jsx";
import Coupons from "./pages/Coupons.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Users from "./pages/Users.jsx";
import AdminProductReviews from "./pages/AdminProductReviews.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/add",
        element: <Add />,
      },
      {
        path: "/list",
        element: <List />,
      },
      {
        path: "/order",
        element: <Orders />,
      },
      {
        path: "/coupons",
        element: <Coupons />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/Users",
        element: <Users />,
       
      },

    {
      path: "/admin/products/:id/reviews",
      element: <AdminProductReviews/>,
    }
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
