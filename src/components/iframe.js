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
    let src = this.data.src;
    this.el.addEventListener('click', function (evt) {
      console.log('Se hizo click en la entidad:', evt);
      scene.emit("show_iframe", { src })
      // Aquí puedes agregar la acción que desees (por ejemplo, cambiar color, reproducir animación, etc.)
      // this.setAttribute('material', 'color', 'red'); // Ejemplo: cambiar color a rojo
    });

    // //new aproach
    // // Crear un contenedor para el iframe fuera de la vista (oculto)
    // this.container = document.createElement('div');
    // this.container.style.position = 'absolute';
    // this.container.style.top = '-10000px';
    // this.container.style.left = '-10000px';

    // let width = this.data.width === undefined ? IFRAME_WIDTH_PX : IFRAME_WIDTH_PX * this.data.width
    // let height = this.data.height === undefined ? IFRAME_HEIGHT_PX : IFRAME_HEIGHT_PX * this.data.height

    // // Establecer dimensiones en píxeles para la captura
    // // Ajusta estos valores según la resolución deseada de la textura
    // this.container.style.width = width;
    // this.container.style.height = height;

    // // Crear el elemento iframe
    // this.iframe = document.createElement('iframe');
    // this.iframe.src = this.data.src;
    // this.iframe.style.width = `${width}px`;
    // this.iframe.style.height = `${height}px`;
    // this.iframe.style.border = 'none';

    // this.container.appendChild(this.iframe);
    // document.body.appendChild(this.container);

    //console.log(iframe);

    // // Crear geometría del plano
    // this.plane = new THREE.Mesh(
    //   new THREE.PlaneGeometry(IFRAME_WIDTH_M, IFRAME_HEIGHT_M),
    //   new THREE.MeshBasicMaterial({side: THREE.DoubleSide})
    // );
    // this.el.object3D.add(this.plane);

    // this.updateTexture();
    // this.interval = setInterval(() => this.updateTexture(), 50000);


    
    let width = this.data.width === undefined ? IFRAME_WIDTH_PX : IFRAME_WIDTH_PX * this.data.width
    let height = this.data.height === undefined ? IFRAME_HEIGHT_PX : IFRAME_HEIGHT_PX * this.data.height
    const browserEl = document.createElement("div");
    browserEl.style.width = `${width}px`;
    browserEl.style.height = `${height}px`;
    this.browserEl = browserEl;

    const geometry = new THREE.PlaneBufferGeometry(IFRAME_WIDTH_M, IFRAME_HEIGHT_M*2, 1, 1);
    const material = new THREE.ShaderMaterial({
      fragmentShader: `void main() {
        gl_FragColor = vec4(0, 0, 0, 0);
      }`,
      side: THREE.DoubleSide,
      blending: THREE.NoBlending
    });
    window.material = material;
    const mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D("mesh", mesh);
    
    this.cssObject = new CSS3DObject(this.browserEl);

    
    const webglToCSSScale = IFRAME_WIDTH_M / IFRAME_WIDTH_PX;
    this.cssObject.scale.setScalar(webglToCSSScale);
    //this.cssObject = new CSS3DObject();


    this.iframeSystem = this.el.sceneEl.systems["hubs-systems"].iframeSystem;
    this.iframeSystem.register(this);
    this.onChangeSrc = this.onChangeSrc.bind(this);

   

  },
  // updateTexture: function () {
  //   // Usar html2canvas para capturar el iframe
  //   html2canvas(this.container).then(canvas => {
  //     // Crear textura desde el canvas
  //     console.log(this.container);
  //     const texture = new THREE.CanvasTexture(canvas);
  //     console.log(texture);
  //     //texture.minFilter = THREE.LinearFilter;
  //     texture.needsUpdate = true;

  //     // Actualizar material del plano
  //     this.plane.material.map = texture;
  //     this.plane.material.needsUpdate = true;
  //     console.log(this.plane);
  //   }).catch(error => {
  //     console.error('Error al capturar iframe:', error);
  //   });
  // },
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
