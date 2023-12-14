import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./styles.css";
import { router } from "./router";
import { LayoutBase } from "./Layout/base";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <LayoutBase>
    <RouterProvider router={router} />
  </LayoutBase>
);
