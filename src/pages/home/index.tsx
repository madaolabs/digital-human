import { useCallback, useEffect, useRef, useState } from "react";
import { AmmoPhysics } from "three/examples/jsm/Addons.js";

import { MMD3DMulti } from "../../3d/mmd-multi";

const touchPart = {
  head: "think",
  chest: "arrogant",
  leg: "flyingKick",
};

const idleAnimations = ["akimbo", "sayHi", "figureGame"];

export const Home = () => {
  const modelStyleRef = useRef<{
    left: number;
    top: number;
  }>({
    left: 0,
    top: 0,
  });

  const textShowRef = useRef<number>();
  const textIndexRef = useRef<number>(0);

  const timeoutHandler = useRef<number>();

  useEffect(() => {
    AmmoPhysics().then(() => {
      const load3D = new MMD3DMulti();
      load3D.init();
      load3D.render();
      addModelEventListener(load3D);
    });
  }, []);

  const addModelEventListener = useCallback((load3D) => {
    load3D.on("e_model_position", (args) => {
      modelStyleRef.current = {
        left: Math.floor(args.left),
        top: Math.floor(args.top),
      };
    });
    load3D.on("touchPart", (args) => {
      load3D?.switchAnimation(touchPart[args.type]);
    });
    load3D.on("load", () => {
      showDialog({
        left: modelStyleRef.current.left - 300,
        top: modelStyleRef.current.top,
        text: "Hello, guys! This is MMD3D Test",
      });
    });
    load3D.on("idle", () => {
      timeoutHandler.current = setTimeout(() => {
        const randomIndex = (Math.random() * 2).toFixed(0);
        const animationName = idleAnimations[randomIndex];
        load3D.switchAnimation(animationName);
      }, 100);
    });
  }, []);

  function showText(dialogDom: HTMLElement, text: string) {
    dialogDom.textContent = text.slice(0, textIndexRef.current);
    textIndexRef.current += 1;

    if (textIndexRef.current <= text.length) {
      if (textShowRef.current !== undefined) {
        clearTimeout(textShowRef.current);
      }
      textShowRef.current = setTimeout(() => {
        showText(dialogDom, text);
      }, 1000); // 控制文字显示速度，单位为毫秒
    }
  }

  const showDialog = (args: { left: number; top: number; text: string }) => {
    const dialogDom = document.getElementById("conversation-dialog");
    const dialogTextDom = document.getElementById("conversation-dialog-text");
    const dialogCloseDom = document.getElementById("conversation-dialog-close");

    textIndexRef.current = 0;
    textShowRef.current = undefined;

    if (dialogDom && dialogTextDom) {
      dialogCloseDom?.addEventListener("click", () => {
        dialogDom.setAttribute("style", "display: none;");
        if (textShowRef.current !== undefined) {
          clearTimeout(textShowRef.current);
        }
      });
      showText(dialogTextDom, args.text);
      // dialogDom.textContent = args.text;
      dialogDom.setAttribute(
        "style",
        `display: block; left: ${args.left}px; top: ${args.top}px;`
      );
    }
  };
  return null;
};
