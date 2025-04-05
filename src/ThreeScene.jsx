import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import sampleData from "./data/locations.json";
import gsap from "gsap";

function latLonToCartesian(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

const ThreeScene = ({ onDataPointHover }) => {
  const mountRef = useRef(null);
  const controlsRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const dataPointsGroupRef = useRef();
  const hoveredPointRef = useRef(null);
  const baseCylinderGeometryRef = useRef(); // Ref pre základnú geometriu valca
  const defaultPointMaterialRef = useRef(); // Ref pre základný materiál bodu

  const defaultPointColor = 0xff0000;
  const hoverPointColor = 0xffff00;

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let animationFrameId;
    let stars, earthMesh, atmosphereMesh; // Premenné pre čistenie

    if (!rendererRef.current) {
      sceneRef.current = new THREE.Scene();

      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.005,
        sizeAttenuation: true,
      });
      const starVertices = [];
      for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(200);
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(200);
        if (Math.sqrt(x * x + y * y + z * z) > 50) {
          starVertices.push(x, y, z);
        }
      }
      starGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(starVertices, 3)
      );
      stars = new THREE.Points(starGeometry, starMaterial);
      sceneRef.current.add(stars);

      sceneRef.current.add(new THREE.AmbientLight(0xbbbbbb));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight.position.set(5, 3, 5);
      sceneRef.current.add(dirLight);

      cameraRef.current = new THREE.PerspectiveCamera(
        75,
        currentMount.clientWidth / currentMount.clientHeight,
        0.1,
        1000
      );
      cameraRef.current.position.z = 2.5;

      rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
      rendererRef.current.setSize(
        currentMount.clientWidth,
        currentMount.clientHeight
      );
      rendererRef.current.setPixelRatio(window.devicePixelRatio);
      currentMount.appendChild(rendererRef.current.domElement);

      controlsRef.current = new OrbitControls(
        cameraRef.current,
        rendererRef.current.domElement
      );
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.05;
      controlsRef.current.minDistance = 1.1; // Zmenšené pre priblíženie
      controlsRef.current.maxDistance = 10;
      controlsRef.current.target.set(0, 0, 0); // Cieľ vždy v strede

      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load(
        "/earthmap.jpg",
        () => { if (!animationFrameId) animate(); },
        undefined,
        (error) => { console.error("Error loading Earth texture:", error); if (!animationFrameId) animate(); }
      );
      earthTexture.colorSpace = THREE.SRGBColorSpace;

      const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.8,
        metalness: 0.1,
      });
      earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sceneRef.current.add(earthMesh);

      const atmosphereGeometry = new THREE.SphereGeometry(1.03, 64, 64);
      const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      });
      atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      sceneRef.current.add(atmosphereMesh);

      dataPointsGroupRef.current = new THREE.Group();
      baseCylinderGeometryRef.current = new THREE.CylinderGeometry(0.01, 0.01, 1, 8);
      baseCylinderGeometryRef.current.translate(0, 0.5, 0);
      defaultPointMaterialRef.current = new THREE.MeshBasicMaterial({ color: defaultPointColor });

      const maxValue = Math.max(...sampleData.map((p) => p.value), 0);

      sampleData.forEach((point) => {
        const cylinderGeometry = baseCylinderGeometryRef.current.clone();
        const pointMaterial = defaultPointMaterialRef.current.clone(); // Klonujeme základný materiál
        const position = latLonToCartesian(point.lat, point.lon, 1);
        const pointMesh = new THREE.Mesh(cylinderGeometry, pointMaterial);
        pointMesh.position.copy(position);
        const normalizedValue = point.value / maxValue;
        const cylinderHeight = Math.max(0.02, normalizedValue * 0.2);
        pointMesh.scale.set(1, cylinderHeight, 1);
        pointMesh.lookAt(0, 0, 0);
        pointMesh.quaternion.multiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
        );
        pointMesh.userData = { ...point, type: "dataPoint", originalColor: defaultPointColor }; // Uložíme originalColor
        dataPointsGroupRef.current.add(pointMesh);
      });
      sceneRef.current.add(dataPointsGroupRef.current);
    }

    const animate = () => {
      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current, cameraRef.current);
      animationFrameId = requestAnimationFrame(animate);
    };

    if (!animationFrameId) {
      animate();
    }

    const handleResize = () => {
      if (currentMount && rendererRef.current && cameraRef.current) {
        const width = currentMount.clientWidth;
        const height = currentMount.clientHeight;
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    const focusOnPoint = (targetMesh) => {
        if (!cameraRef.current || !controlsRef.current) return;

        const targetPosition = targetMesh.position.clone();
        const offsetDistance = 0.5; // Vzdialenosť kamery od povrchu nad bodom
        // Vypočíta pozíciu kamery tak, aby bola nad bodom a mierne od neho
        const cameraTargetPosition = targetPosition.clone().normalize().multiplyScalar(1 + offsetDistance);

        // Zastavíme prípadné predchádzajúce animácie kamery a targetu
        gsap.killTweensOf(cameraRef.current.position);
        //gsap.killTweensOf(controlsRef.current.target); // Target už nemením

        gsap.to(cameraRef.current.position, {
            duration: 1.2,
            x: cameraTargetPosition.x,
            y: cameraTargetPosition.y,
            z: cameraTargetPosition.z,
            ease: "power3.inOut",
            onUpdate: () => {
                // Počas animácie môže byť potrebné updatovať controls, aj keď target nemením
                // controlsRef.current?.update(); // Update môže byť teraz redundantný, keďže nemením target
            }
        });

        // Cieľ OrbitControls zostáva v strede (0,0,0), nemením ho
        // gsap.to(controlsRef.current.target, { ... }); // TOTO UŽ NEROBÍME
    };


    const handleClick = (event) => {
        if (!cameraRef.current || !dataPointsGroupRef.current || !raycasterRef.current || !mouseRef.current) return;

        // Aktualizujeme raycaster s aktuálnou pozíciou myši
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(dataPointsGroupRef.current.children);

        let clickedPoint = null;
        if (intersects.length > 0) {
            const firstDataPoint = intersects.find(intersect => intersect.object.userData.type === 'dataPoint');
            if (firstDataPoint) {
            clickedPoint = firstDataPoint.object;
            }
        }

        if (clickedPoint) {
            focusOnPoint(clickedPoint);
        } else {
             // Voliteľné: Kliknutie mimo bodu môže vrátiť kameru na pôvodnú pozíciu/zoom
             // resetCameraView();
        }
    };


    const handleMouseMove = (event) => {
      if (!currentMount || !cameraRef.current || !dataPointsGroupRef.current || !raycasterRef.current) return;

      const rect = currentMount.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / currentMount.clientWidth) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / currentMount.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(dataPointsGroupRef.current.children);

      let intersectedPoint = null;
      if (intersects.length > 0) {
        const firstDataPoint = intersects.find(intersect => intersect.object.userData.type === 'dataPoint');
        if (firstDataPoint) {
          intersectedPoint = firstDataPoint.object;
        }
      }

      if (hoveredPointRef.current && hoveredPointRef.current !== intersectedPoint) {
        hoveredPointRef.current.material.color.setHex(hoveredPointRef.current.userData.originalColor || defaultPointColor); // Obnov pôvodnú farbu
        if (onDataPointHover) onDataPointHover(null);
        hoveredPointRef.current = null;
      }

      if (intersectedPoint && hoveredPointRef.current !== intersectedPoint) {
        hoveredPointRef.current = intersectedPoint;
        // Uloženie originalColor do userData bolo pridané pri vytváraní bodov
        hoveredPointRef.current.material.color.setHex(hoverPointColor);
        if (onDataPointHover) onDataPointHover(hoveredPointRef.current.userData);
      }
    };

    window.addEventListener("resize", handleResize);
    currentMount.addEventListener("mousemove", handleMouseMove);
    currentMount.addEventListener('click', handleClick);


    return () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      window.removeEventListener("resize", handleResize);
      if (currentMount) {
        currentMount.removeEventListener("mousemove", handleMouseMove);
        currentMount.removeEventListener("click", handleClick);
        // Odstrániť rendererov DOM element, ak existuje a je dieťaťom currentMount
        if (rendererRef.current?.domElement && currentMount.contains(rendererRef.current.domElement)) {
             // currentMount.removeChild(rendererRef.current.domElement); // Odstránenie nie je nutné pre HMR
        }
      }

       // Pri odpojení komponentu (nie len HMR) by sme mali vyčistiť viac:
        // gsap.killTweensOf(cameraRef.current.position); // Zastav animácie
        // controlsRef.current?.dispose();
        // sceneRef.current?.traverse(object => { /* dispose geometries, materials, textures */ });
        // rendererRef.current?.dispose();
        // // Nulovanie referencií
        // rendererRef.current = null; sceneRef.current = null; cameraRef.current = null; controlsRef.current = null; // atď.

    };
  }, [onDataPointHover]);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "100%", display: "block", cursor: "grab" }}
    />
  );
};

export default ThreeScene;