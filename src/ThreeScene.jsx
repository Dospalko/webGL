import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const ThreeScene = () => {
  const mountRef = useRef(null); // Ref pre pripojenie canvasu

  useEffect(() => {
    // --- Základné nastavenie Three.js ---
    const currentMount = mountRef.current;

    // 1. Scéna
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Tmavé pozadie

    // 2. Kamera
    const camera = new THREE.PerspectiveCamera(
      75, // FOV (Field of View)
      currentMount.clientWidth / currentMount.clientHeight, // Aspect Ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    camera.position.z = 5; // Posun kamery

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias pre hladšie hrany
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement); // Pripoj canvas do divu

    // 4. Objekt (Kocka)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    // Použijeme MeshStandardMaterial, aby reagoval na svetlo
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); 
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // 5. Svetlo (aby sme videli MeshStandardMaterial)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Jemné svetlo všade
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1); // Silnejšie svetlo z jedného bodu
    pointLight.position.set(5, 5, 5); // Pozícia svetla
    scene.add(pointLight);


    // --- Animačná slučka ---
    let animationFrameId;
    const animate = () => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // --- Handler pre zmenu veľkosti okna ---
    const handleResize = () => {
      if (currentMount) {
        // Aktualizuj veľkosť renderera
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        // Aktualizuj pomer strán kamery
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix(); // Nutné po zmene parametrov kamery
      }
    };
    window.addEventListener('resize', handleResize);


    // --- Čistiaca funkcia (Cleanup) ---
    // Spustí sa, keď sa komponent odpojí (unmount)
    return () => {
      // Zastav animáciu
      cancelAnimationFrame(animationFrameId); 
      // Odstráň listener pre resize
      window.removeEventListener('resize', handleResize);
      // Odstráň canvas z DOMu
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      // Tu by si mohol pridať aj dispose pre geometrie, materiály atď. pre uvoľnenie pamäte
      geometry.dispose();
      material.dispose();
      // renderer.dispose(); // Ak máš komplexnejšiu scénu
    };

  }, []); // Prázdne pole závislostí znamená, že useEffect sa spustí len raz po prvom renderovaní

  // Vrátime div, do ktorého Three.js vloží svoj canvas
  // Dôležité je nastaviť mu rozmery cez CSS (napr. v #root alebo priamo tu)
  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', display: 'block' }} // Zaistí, že div zaberie priestor
    />
  );
};

export default ThreeScene;