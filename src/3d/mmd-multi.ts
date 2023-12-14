import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { MMDLoader } from "three/addons/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { MouseFocusHelper } from "./MouseFocusHelper.js";
import { Base3D } from "./base";
import { AmmoPhysicsObject, OrbitControls } from "three/examples/jsm/Addons.js";
import { appWindow } from "@tauri-apps/api/window";

const MMD_URL = "/刻晴改胡桃/刻晴.pmx";
const MMD_FUNINGNA = "funingna/芙宁娜shenti.pmx";
const MMD_SHIYU2 = "funingna/芙宁娜yifu.pmx";

const animationsMap = {
  stand: "/mmd动作/原神站立.vmd",
  figureGame: "/mmd动作/手指游戏.vmd",
  akimbo: "/mmd动作/叉腰.vmd",
  sayHi: "/mmd动作/打招呼.vmd",
  think: "/mmd动作/思考托腮.vmd",
  arrogant: "/mmd动作/嚣张.vmd",
  flyingKick: "/mmd动作/飞踢.vmd",
};

const animationsName = Object.getOwnPropertyNames(animationsMap);

const defaultAnimationName = "stand";

const POSE_URL = "/01.vpd";

const stats = new Stats();

const MMDLoaderIns = new MMDLoader();

const modeGroup = new THREE.Group();

const animationHelper = new MMDAnimationHelper({
  sync: false,
  afterglow: 2.0,
  pmxAnimation: true,
});
animationHelper.enable("animation", false);

const modelPosition = new THREE.Vector3(0, -10, 0);

let currentPlayAnimation = defaultAnimationName;
let currentModel = 0;

export class MMD3DMulti extends Base3D {
  raycaster?: THREE.Raycaster;
  mouseFocusHelpers: MouseFocusHelper[] = [];
  modelWCHeight: number = 0;
  modelWCWidth: number = 0;
  meshes: THREE.SkinnedMesh[] = [];
  orbitControls?: OrbitControls;
  animationMixers: THREE.AnimationMixer[] = [];
  animationHelpers: MMDAnimationHelper[] = [];
  animationClips: WeakMap<THREE.SkinnedMesh, THREE.AnimationClip[]> =
    new WeakMap();
  physics?: AmmoPhysicsObject;

  static clock = new THREE.Clock();

  constructor() {
    super();
    document.body.appendChild(stats.dom);
  }

  async init() {
    this.initMMD([MMD_FUNINGNA, MMD_SHIYU2]);
    this.initControls();
    this.initRaycaster();
    this.initLights();
    this.initShadow();
    this._addEventListeners();
    this.scene?.add(modeGroup);
  }

  initShadow = () => {
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000); // 骨架
    const planeMaterial = new THREE.ShadowMaterial({
      opacity: 0.1,
      // clipShadows: true,
      transparent: true,
    }); // 可产生阴影的材质
    planeMaterial.side = THREE.DoubleSide;
    const plane = new THREE.Mesh(planeGeometry, planeMaterial); // 网格
    plane.position.set(modelPosition.x, modelPosition.y - 1, modelPosition.z);
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    modeGroup.add(plane);
  };

  switchAnimation(animationName: string) {
    console.log("animationName===>", animationName);
    this._playAnimation(animationName);
  }

  initControls = () => {
    if (this.scene && this.camera && this.renderer) {
      // const dragControls = new DragControls(
      //   [this.mesh],
      //   this.camera,
      //   this.renderer.domElement
      // );
      // dragControls.addEventListener("dragend", (event) => {
      //   this.syncModelPosition(event.object);
      // });

      const orbitControls = new OrbitControls(
        this.camera,
        this.renderer.domElement
      );
      orbitControls.enableRotate = false;
      orbitControls.mouseButtons.LEFT = orbitControls.mouseButtons.RIGHT;
      orbitControls.mouseButtons.RIGHT = null;
      this.orbitControls = orbitControls;
    }
  };

  syncModelPosition = (model: THREE.Object3D) => {
    const position = new THREE.Vector3();
    model.localToWorld(position);
    // 模型的起点设置为模型的左上角
    position.setY(position.y + this.modelWCHeight);
    if (this.camera) {
      const NDCoor = position.project(this.camera);
      // 转换 NDC 坐标 至屏幕坐标
      const left = ((NDCoor.x + 1) * window.innerWidth) / 2;
      const top = -((NDCoor.y - 1) * window.innerHeight) / 2;

      // 拖拽结束时触发
      this.emit("e_model_position", {
        left,
        top,
      });
    }
  };

  _initGUI = async (mesh: THREE.SkinnedMesh) => {
    const gui = new GUI();
    const morphs = gui.addFolder("Morphs");
    const animationsFolder = gui.addFolder("Animations");
    const modelsFolder = gui.addFolder("Models");
    const dictionary = mesh.morphTargetDictionary!;

    const controls = {};
    const keys: string[] = [];

    const initKey = () => {
      for (const key in dictionary) {
        controls[key] = 0.0;
        keys.push(key);
      }
      controls["animation"] = defaultAnimationName;
      controls["models"] = currentModel;
      const animationsFile: { [key: string]: string } = {
        // default: currentPlayAnimation,
      };
      for (const animationKey in animationsMap) {
        if (Object.prototype.hasOwnProperty.call(animationsMap, animationKey)) {
          animationsFile[animationKey] = animationKey;
        }
      }

      animationsFolder
        .add(
          controls,
          "animation" as never,
          animationsFile as Record<string, never>
        )
        .onChange((value) => {
          this._playAnimation(value);
        });

      const modelsFile: { [key: string]: number } = {
        芙宁娜: 0,
        刻晴: 1,
      };
      modelsFolder
        .add(controls, "models" as never, modelsFile as Record<string, never>)
        .onChange((value) => {
          currentModel = value;
          modeGroup.remove(...this.meshes);
          for (const mesh of this.meshes) {
            this.animationClips.delete(mesh);
            animationHelper.remove(mesh);
          }
          this.meshes = [];

          switch (value) {
            case 0:
              this.initMMD([MMD_FUNINGNA, MMD_SHIYU2]);
              break;
            case 1:
              this.initMMD([MMD_URL]);
              break;
            default:
              break;
          }
        });
    };

    function initMorphs() {
      for (const key in dictionary) {
        morphs
          .add(controls, key as never, 0.0, 1.0, 0.01)
          .onChange(onChangeMorph);
      }
    }

    function onChangeMorph() {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = controls[key];
        mesh.morphTargetInfluences![i] = value;
      }
    }

    initKey();
    initMorphs();

    morphs.close();
    animationsFolder.open();
    modelsFolder.open();
  };

  initMMD = async (urls: string[]) => {
    // 设置相机位置
    this.camera?.position.set(0, 0, 50);
    this.light?.position.set(-5, 10, 0);
    const meshes = await Promise.all(
      urls.map((url) => MMDLoaderIns.loadAsync(url))
    );

    for (let index = 0; index < meshes.length; index++) {
      const mesh = meshes[index];
      console.log("mesh===>", mesh);
      this.meshes?.push(mesh);
      // this.animationMixers.push(new THREE.AnimationMixer(mesh));
      // this.animationMixers.forEach((animationMixer) => {
      //   animationMixer.addEventListener("finished", (e) => {
      //     console.log("finished", e);
      //   });
      // });

      const animationClips = await Promise.all(
        Object.entries(animationsMap).map(([_, animationValue]) => {
          return this.loadAnimation(mesh, animationValue);
        })
      );

      this.animationClips.set(mesh, animationClips);
      animationHelper.add(mesh, {
        animation: animationClips,
      });

      // 开启阴影
      mesh.castShadow = true;
      mesh.position.set(modelPosition.x, modelPosition.y, modelPosition.z);

      // this.mesh = mesh;

      // for (const animation_url of animations) {
      //   await this.loadAnimation(mesh, animation_url);
      // }
      // this.animationMixer.clipAction(this.animationClips![0]).play();
      // await this.loadPose(mesh);
      // group.add(mesh);
      // if (index === 0) {
      //   group.add(mesh);
      //   this.syncModelPosition(mesh);
      //   this._calcHeight(mesh);
      //   this._calcHeight(mesh);
      //   this._initGUI(mesh);
      //   this._initMouceFocusHelper(mesh);
      // } else {
      //   mesh.position.set(10, -10, 0);
      // }
      modeGroup.add(mesh);
      this._initMouceFocusHelper(mesh);
      if (index === 0) {
        // 先计算模型的高宽
        this._calcHeight(mesh);
        // 同步模型的位置给外部
        this.syncModelPosition(mesh);
        this._initGUI(mesh);
      }
    }
    this.emit("load");
    this.emit("idle");
    this._playDefaultAnimation(true);
  };

  initRaycaster = () => {
    const raycaster = new THREE.Raycaster();
    this.raycaster = raycaster;
  };

  initLights = () => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    this.scene?.add(ambientLight);
  };

  loadAnimation = async (mesh: THREE.SkinnedMesh, animation_url: string) => {
    return new Promise<THREE.AnimationClip>((resolve, reject) => {
      MMDLoaderIns.loadAnimation(
        animation_url,
        mesh,
        (animation) => {
          const animationClip = animation as THREE.AnimationClip;
          console.log(
            "animationClip duration===>",
            animationClip.uuid,
            animationClip.duration
          );
          resolve(animationClip);
        },
        () => {},
        reject
      );
    });
  };

  loadPose = async (mesh) => {
    return new Promise<void>((resolve, reject) => {
      MMDLoaderIns.loadVPD(
        POSE_URL,
        false,
        (vpd) => {
          const animationHelper = new MMDAnimationHelper({
            afterglow: 2.0,
          });
          this.animationHelpers.push(animationHelper);
          animationHelper.pose(mesh, vpd);
          resolve();
        },
        () => {},
        reject
      );
    });
  };

  _calcHeight = (mesh: THREE.SkinnedMesh) => {
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    // let minYPoint = new THREE.Vector3();
    // let maxYPoint = new THREE.Vector3();
    // let minXPoint = new THREE.Vector3();
    // let maxXPoint = new THREE.Vector3();
    const positionAttribute = mesh.geometry.attributes.position;
    // 遍历顶点属性
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }

    this.modelWCHeight = Math.abs(maxY - minY);
    this.modelWCWidth = Math.abs(maxX - minX);
  };

  _initMouceFocusHelper = (model) => {
    const head = model.skeleton.bones.find((bone) => bone.name === "頭");
    if (head) {
      this.mouseFocusHelpers.push(new MouseFocusHelper(head, this.camera));
    }
  };

  _addEventListeners() {
    document.addEventListener("pointermove", this._onPointerMove);
    document.addEventListener("pointerup", this._onPointerUp);
    document.addEventListener("pointerdown", this._onPointerDown);
  }

  _playDefaultAnimation(isInit: boolean) {
    if (!isInit) {
      // 默认添加第一个动画或者某个动画
      if (currentPlayAnimation !== defaultAnimationName)
        this._playAnimation(defaultAnimationName, true);
    } else {
      this.meshes.forEach((mesh) => {
        animationHelper.objects.get(mesh)?.mixer?.stopAllAction();
        this.animationClips.get(mesh)?.forEach((clip, clipIndex) => {
          const action = animationHelper.objects
            .get(mesh)
            ?.mixer?.clipAction(clip);
          if (clipIndex === 0) action?.play();
        });
      });
      animationHelper.enable("animation", true);
    }
  }

  _finishedAnimationEvent = (event) => {
    console.log("event===> finished", event);
    this.emit("idle");
    this._playDefaultAnimation(false);
  };

  _playAnimation = (animationName: string, loop: boolean = false) => {
    const toAnimationIndex = animationsName.indexOf(animationName);
    const currentPlayAnimationIndex =
      animationsName.indexOf(currentPlayAnimation);
    this.meshes.forEach((mesh, meshIndex) => {
      const mixer = animationHelper.objects.get(mesh)?.mixer;
      if (meshIndex === 0) {
        !mixer?.hasEventListener("finished", this._finishedAnimationEvent) &&
          mixer?.addEventListener("finished", this._finishedAnimationEvent);
      }
      const animationClip =
        this.animationClips.get(mesh)?.[currentPlayAnimationIndex];
      const toAnimationClip = this.animationClips.get(mesh)?.[toAnimationIndex];

      if (animationClip && toAnimationClip) {
        const fromAnimationAction = mixer?.existingAction(animationClip);

        const toAnimationAction = mixer?.existingAction(toAnimationClip);

        console.log("animationCli===>", fromAnimationAction, toAnimationAction);

        if (fromAnimationAction && toAnimationAction) {
          animationHelper.objects.get(mesh)?.mixer?.stopAllAction();
          toAnimationAction.clampWhenFinished = false;
          toAnimationAction
            .reset()
            .setLoop(
              loop ? THREE.LoopRepeat : THREE.LoopOnce,
              loop ? Number.MAX_SAFE_INTEGER : 1
            )
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1);
          toAnimationAction.play();

          toAnimationAction.crossFadeFrom(fromAnimationAction, 1, true);

          fromAnimationAction.crossFadeTo(toAnimationAction, 1, true);
        }
      }
    });
    currentPlayAnimation = animationName;
  };

  _onPointerMove = (event) => {
    if (this.raycaster && this.camera && this.scene) {
      const pointer = new THREE.Vector2();
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children);
      if (intersects.length > 0) {
        const intersection = intersects[0];
        console.log("intersection===>");
        if ((intersection.object as THREE.SkinnedMesh).isSkinnedMesh) {
          appWindow.setIgnoreCursorEvents(false);
        } else {
          appWindow.setIgnoreCursorEvents(true);
        }
      }
    }
  };

  _onPointerDown = (event: PointerEvent) => {
    const pointer = new THREE.Vector2();
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (
      this.raycaster &&
      this.scene &&
      this.camera &&
      event.button === 0 &&
      this.orbitControls
    ) {
      this.raycaster.setFromCamera(pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(
        this.scene.children,
        true
      );
      if (
        intersects.length > 0 &&
        intersects[0].object.type === "SkinnedMesh"
      ) {
        // isUpdateOrbitControls = true;
      } else {
        // isUpdateOrbitControls = false;
      }
    }
  };

  _onPointerUp = (event: PointerEvent) => {
    event.preventDefault();
    // isUpdateOrbitControls = false;
    const pointer = new THREE.Vector2();
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    if (this.raycaster && this.scene && this.camera) {
      this.raycaster.setFromCamera(pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(
        this.scene.children,
        true
      );
      if (intersects.length > 0) {
        const modelWC = intersects[0].object.position;
        const pointWC = intersects[0].point;
        const heightRatio = (pointWC.y - modelWC.y) / this.modelWCHeight;
        console.log(
          "heightRatio===>",
          pointWC.y,
          modelWC.y,
          this.modelWCHeight,
          heightRatio
        );
        if (heightRatio > 0.8) {
          // this._playAnimation(1);
          this.emit("touchPart", { type: "head" });
        } else if (heightRatio > 0.6 && heightRatio < 0.7) {
          this.emit("touchPart", { type: "chest" });
        } else if (heightRatio < 0.6) {
          this.emit("touchPart", { type: "leg" });
        }
      }
    }
  };

  public render = () => {
    requestAnimationFrame(this.render);
    stats.update();
    const delta = MMD3DMulti.clock.getDelta();
    this.orbitControls?.update(delta);
    this.mouseFocusHelpers.forEach((focusHelper) => focusHelper.focus());
    // this.animationMixers.forEach((animationMixer) =>
    //   animationMixer.update(delta)
    // );
    animationHelper.update(delta);
    // this.animationHelpers[currentPlayAnimation]?.update(delta);
    this._render();
  };
}
