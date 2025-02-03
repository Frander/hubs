import { THREE } from "aframe";
import React from "react";
import { render } from "react-dom";
import PropTypes from "prop-types";
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import ReactDOM from "react-dom/client";
import { createRoot } from "react-dom/client";
import { WebPageUrlModalContainer } from "../react-components/room/WebPageUrlModalContainer";

import "three/examples/jsm/renderers/CSS3DRenderer";
import styles from "./iframe.scss";
import { title } from "process";
const IFRAME_WIDTH_M = 1.6;
const IFRAME_HEIGHT_M = 0.9;
const IFRAME_WIDTH_PX = 1280;
const IFRAME_HEIGHT_PX = 1280;
function Browser({ scene, src, widht, height, onChangeSrc }) {

  const showModalIframe = () => {
    scene.emit("show_iframe", { src })
  };

  return (
    <div className={styles.browser} 
        onClick={() => showModalIframe()}>
      <div style={{ pointerEvents: "none" }}>
      {/* <div className={styles.addressBar}>
        <input className={styles.addressField} value={src} onChange={onChangeSrc} />
      </div> */}
        <iframe src={src} style={{ width: widht, height: height }} />
      </div>
    </div>
    
  );
}
Browser.propTypes = {
  onChangeSrc: PropTypes.func,
  src: PropTypes.string
};
AFRAME.registerComponent("iframe", {
  schema: {
    src: { type: "string" },
    width: { type: "float" },
    height: { type: "float" }
  },
  init: function() {
    console.log("IFRAME DATA");
    console.log(this.data);
    let width = this.data.width === undefined ? IFRAME_WIDTH_PX : IFRAME_WIDTH_PX * this.data.width
    let height = this.data.height === undefined ? IFRAME_HEIGHT_PX : IFRAME_HEIGHT_PX * this.data.height
    const browserEl = document.createElement("div");
    browserEl.style.width = `${width}px`;
    browserEl.style.height = `${height}px`;
    this.browserEl = browserEl;
    // const geometry = new THREE.PlaneBufferGeometry(IFRAME_WIDTH_M, IFRAME_HEIGHT_M, 1, 1);
    // const material = new THREE.ShaderMaterial({
    //   fragmentShader: `void main() {
    //     gl_FragColor = vec4(0, 0, 0, 0);
    //   }`,
    //   side: THREE.DoubleSide
    // });
    //window.material = material;
    //const mesh = new THREE.Mesh(geometry, material);
    //this.el.setObject3D("mesh", mesh);
    this.cssObject = new CSS3DObject(this.browserEl);
    
    const webglToCSSScale = IFRAME_WIDTH_M / IFRAME_WIDTH_PX;
    this.cssObject.scale.setScalar(webglToCSSScale);
    this.iframeSystem = this.el.sceneEl.systems["hubs-systems"].iframeSystem;
    this.iframeSystem.register(this);
    this.onChangeSrc = this.onChangeSrc.bind(this);

  },
  onChangeSrc(event) {
    this.el.setAttribute("iframe", { src: event.target.value });
  },
  update(prevData) {
    let renderRoot = document.querySelector("#main-scene div")
    renderRoot.style.zIndex = 0;
    renderRoot.style.pointerEvents = "none";
    let width = this.data.width === undefined ? IFRAME_WIDTH_PX : IFRAME_WIDTH_PX * this.data.width
    let height = this.data.height === undefined ? IFRAME_HEIGHT_PX : IFRAME_HEIGHT_PX * this.data.height

    if (this.data.src !== prevData.src) {
        render(<Browser scene={this.el.sceneEl} src={this.data.src} widht={width} height={height} onChangeSrc={this.onChangeSrc} />, this.browserEl);
    }
  },

  remove() {
    this.iframeSystem.unregister(this);
  }
});
