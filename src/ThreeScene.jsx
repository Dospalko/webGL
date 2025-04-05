import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
// Import OrbitControls
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import sampleData from './data/locations.json'; // Načítanie dát z JSON súboru
function latLonToCartesian(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);   // Sklon od osi Y (uhol k pólu)
    const theta = (lon + 180) * (Math.PI / 180); // Azimut okolo osi Y (uhol od -Z osi)

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}

const ThreeScene = ({ onDataPointHover }) => { // Pridáme prop pre komunikáciu s App
  const mountRef = useRef(null);
  const controlsRef = useRef(); // Ref pre OrbitControls

  useEffect(() => {
    const currentMount = mountRef.current;
    let animationFrameId;

    // --- Scéna, Kamera, Renderer (podobné ako predtým) ---
    const scene = new THREE.Scene();
    // Môžeme pridať jemné ambientné svetlo, aby bola textúra viditeľná aj bez priameho svetla
    scene.add(new THREE.AmbientLight(0xaaaaaa)); 
    // Pridáme aj smerové svetlo pre tiene a zvýraznenie tvaru
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);


    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3; // Začneme trochu bližšie

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    // --- OrbitControls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Plynulejší pohyb
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5; // Minimálny zoom
    controls.maxDistance = 10;  // Maximálny zoom
    controlsRef.current = controls; // Uložíme referenciu

    // --- Zemeguľa ---
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/zem1.jpg'); // Načítanie z /public

    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32); // Guľa s polomerom 1
    // Použijeme MeshStandardMaterial pre realistickejší vzhľad so svetlom
    const sphereMaterial = new THREE.MeshStandardMaterial({
       map: earthTexture,
       // roughness: 0.7, // Menej lesklý povrch
       // metalness: 0.1, 
    }); 
    const earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(earthMesh);


    const dataPointsGroup = new THREE.Group(); // Skupina pre ľahšiu manipuláciu
    const pointGeometry = new THREE.SphereGeometry(0.015, 16, 16); // Malá gulička pre marker

    sampleData.forEach(point => {
    const pointMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, // Napr. červená farba
        // Farbu môžeme neskôr nastaviť podľa point.value
    }); 
    
    const position = latLonToCartesian(point.lat, point.lon, 1.01); // 1.01 aby boli mierne nad povrchom
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.copy(position);
    pointMesh.userData = { id: point.id, name: point.name, value: point.value }; // Uložíme dáta do objektu
    
    dataPointsGroup.add(pointMesh);
    });

    scene.add(dataPointsGroup); 


    // --- Animačná slučka ---
    const animate = () => {
      controls.update(); // Nutné pre damping u OrbitControls
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // --- Resize Handler (rovnaký ako predtým) ---
     const handleResize = () => {
        if (currentMount) {
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
        }
    };
    window.addEventListener('resize', handleResize);


    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose(); // Uvoľnenie OrbitControls
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      // Uvoľnenie zdrojov Three.js
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      earthTexture.dispose();
      // Aj svetlá a iné zdroje by sa mali uvoľniť v komplexnejšej aplikácii
    };

  }, []); // Spustí sa len raz

  // Div pre canvas
  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default ThreeScene;