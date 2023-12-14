import * as THREE from "three";
import EventEmitter from "eventemitter3";

export abstract class Base3D extends EventEmitter {
  camera?: THREE.Camera;
  scene?: THREE.Scene;
  renderer?: THREE.Renderer;
  light?: THREE.Light;

  constructor() {
    super();
    this._init();
  }

  _init(): void {
    this._initScene();
    this._initCamera();
    this._initRenderer();
    this._light();
  }

  _initCamera(): void {
    const camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.25,
      2000
    );
    this.camera = camera;
    this.scene?.add(this.camera);
  }

  _initScene(): void {
    const scene = new THREE.Scene();
    this.scene = scene;
  }

  _light(): void {
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.castShadow = true;
    light.visible = true;
    light.shadow.bias = -0.01;
    light.shadow.camera.near = 0;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -100;
    light.shadow.camera.right = 100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    this.light = light;
    this.camera?.add(light);
  }

  _initRenderer(): void {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.LinearDisplayP3ColorSpace;
    this.renderer = renderer;

    document
      .getElementById("canvas-container")
      ?.appendChild(this.renderer.domElement);
  }

  _render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
