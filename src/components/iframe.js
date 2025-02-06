import { THREE } from "aframe";
//import React from "react";
import { render } from "react-dom";
import PropTypes from "prop-types";
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import ReactDOM from "react-dom/client";
import { createRoot } from "react-dom/client";
import { WebPageUrlModalContainer } from "../react-components/room/WebPageUrlModalContainer";

import "three/examples/jsm/renderers/CSS3DRenderer";
import styles from "./iframe.scss";
import html2canvas from 'html2canvas';
import React, { useEffect, useRef } from 'react';

const IFRAME_WIDTH_M = 1.6;
const IFRAME_HEIGHT_M = 0.9;
const IFRAME_WIDTH_PX = 1280;
const IFRAME_HEIGHT_PX = 1280;
function Browser({ scene, src, widht, height, onChangeSrc }) {

  // useEffect(() => {
  //   const iframe = iframeRef.current;

  //   const handleIframeLoad = () => {
  //     if (iframeContainerRef.current) {
  //       html2canvas(iframeContainerRef.current)
  //         .then((capturedCanvas) => {
  //           const texture = new THREE.CanvasTexture(capturedCanvas);
  //         })
  //     }
  //   }
  // })

  const showModalIframe = () => {
    scene.emit("show_iframe", { src })
  };

  return (
    <div id={"htmlElement"} className={styles.browser} 
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
    const geometry = new THREE.PlaneBufferGeometry(IFRAME_WIDTH_M, IFRAME_HEIGHT_M, 1, 1);
    const material = new THREE.ShaderMaterial({
      fragmentShader: `void main() {
        gl_FragColor = vec4(0, 0, 0, 0);
      }`,
      side: THREE.DoubleSide
    });
    window.material = material;
    const mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D("mesh", mesh);
    
    const element = document.createElement('div');
    element.style.width = '800px';
    element.style.height = '600px';
    element.style.backgroundColor = 'red';

    //this.cssObject = new CSS3DObject(element);

    this.el.setObject3D("mesh", mesh);
    
    
    const webglToCSSScale = IFRAME_WIDTH_M / IFRAME_WIDTH_PX;
    this.cssObject.scale.setScalar(webglToCSSScale);
    const iframe = document.createElement('iframe');
    iframe.src = 'https://mokacreativa.com';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    console.log(iframe);
    html2canvas(iframe).then(function (capturedCanvas) {
      // Crear la textura a partir del canvas capturado
      const texture = new THREE.CanvasTexture(capturedCanvas);
      const geometry = new THREE.PlaneGeometry(4, 3);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const plane = new THREE.Mesh(geometry, material);
      this.html2canvasItem = plane;
      console.log(plane);

      this.iframeSystem = this.el.sceneEl.systems["hubs-systems"].iframeSystem;
      this.iframeSystem.register(this);
      this.onChangeSrc = this.onChangeSrc.bind(this);
    })

   

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
