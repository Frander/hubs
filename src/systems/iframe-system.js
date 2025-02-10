import styles from "../components/iframe.scss";
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export class IframeSystem {
  constructor(scene) {
    this.scene = scene;

    this.scene.addEventListener("spawn-iframe", this.onSpawnIframe);
    this.scene.addEventListener("inspect-target-changed", this.onInspect);

    this.scene.renderer.setClearColor(0x000000, 0);

    this.cssScene = new THREE.Scene();
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.domElement.style.position = "absolute";
    this.cssRenderer.domElement.style.zIndex = -1;
    this.cssRenderer.domElement.style.pointerEvents = "none";
    scene.appendChild(this.cssRenderer.domElement);


    this.cssScene2 = new THREE.Scene();
    this.cssRenderer2 = new CSS3DRenderer();
    this.cssRenderer2.domElement.style.position = "absolute";
    this.cssRenderer2.domElement.style.zIndex = 1;
    this.cssRenderer2.domElement.style.pointerEvents = "none";

    scene.appendChild(this.cssRenderer2.domElement);


    this.lastWidth = null;
    this.lastHeight = null;

    this.iframes = [];
  }

  onSpawnIframe = event => {
    console.log("iframe: onSpawnIframe");
    const entity = document.createElement("a-entity");
    this.scene.appendChild(entity);
    //entity.setAttribute("page-thumbnail", { src: event.detail.src });
    entity.setAttribute("iframe", { src: event.detail.src });
    entity.setAttribute("geometry", { primitive: "box" });
    entity.setAttribute("material", { shader: "html", target: "#htmlElement" });
    // entity.setAttribute("offset-relative-to", { target: "#avatar-pov-node", offset: { x: 0, y: 0, z: -1 } });
    // entity.setAttribute("networked", { template: "#interactable-iframe-media" });
  };

  onInspect = event => {
    const inspectTarget = event.detail.inspectTarget;

    const iframeComponent = inspectTarget?.el?.components.iframe;

    if (iframeComponent) {
      this.cssRenderer.domElement.classList.add(styles.inspectIframe);
    } else {
      this.cssRenderer.domElement.classList.remove(styles.inspectIframe);
    }
  };

  register(iframeComponent) {
    this.iframes.push(iframeComponent);
    this.cssScene.add(iframeComponent.cssObject);
    this.cssScene2.add(iframeComponent.cssObject1);
  }

  unregister(iframeComponent) {
    const index = this.iframes.indexOf(iframeComponent);

    if (index !== -1) {
      this.iframes.splice(index);
    }

    this.cssScene.remove(iframeComponent.cssObject);
    this.cssScene2.remove(iframeComponent.cssObject2);

  }

  tick() {
    const canvas = this.scene.renderer.domElement;
    const camera = this.scene.camera;

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientWidth;

    if (this.lastWidth !== canvasWidth || this.lastHeight !== canvasHeight) {
      this.cssRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
      this.cssRenderer2.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    for (let i = 0; i < this.iframes.length; i++) {
      const iframeComponent = this.iframes[i];
      const webglObject = iframeComponent.el.object3D;
      const cssObject = iframeComponent.cssObject;
      const cssObject2 = iframeComponent.cssObject2;

      webglObject.updateMatrixWorld(true);

      cssObject.position.copy(webglObject.position);
      cssObject.rotation.copy(webglObject.rotation);
      cssObject.matrixNeedsUpdate = true;

      cssObject2.position.copy(webglObject.position);
      cssObject2.rotation.copy(webglObject.rotation);
      cssObject2.matrixNeedsUpdate = true;
    }

    this.cssRenderer.render(this.cssScene, camera);
    this.cssRenderer2.render(this.cssScene2, camera);
  }
}