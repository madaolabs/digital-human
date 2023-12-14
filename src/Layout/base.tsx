import { PropsWithChildren } from "react";

import "./style.css";

export function LayoutBase({ children }: PropsWithChildren) {
  return (
    <div>
      <div className="conversation-dialog" id="conversation-dialog">
        <div
          className="conversation-dialog-text"
          id="conversation-dialog-text"
        ></div>
        <div
          className="conversation-dialog-close"
          id="conversation-dialog-close"
        ></div>
      </div>
      <div id="canvas-container"></div>
      {children}
    </div>
  );
}
