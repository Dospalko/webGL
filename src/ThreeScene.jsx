import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import sampleData from "./data/locations.json"; // Import dát

// --- Pomocná funkcia na konverziu Lat/Lon na 3D súradnice ---
function latLonToCartesian(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// --- React Komponent ---
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

  // Farby pre vizualizáciu
  const defaultPointColor = 0xff0000; // Červená
  const hoverPointColor = 0xffff00; // Žltá

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let animationFrameId;

    // --- Inicializácia (iba ak ešte neexistuje renderer) ---
    if (!rendererRef.current) {
      // 1. Scéna
      sceneRef.current = new THREE.Scene();

      // --- Hviezdne Pozadie ---
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.005, // Malá veľkosť hviezdičiek
        sizeAttenuation: true, // Menšie hviezdy v diaľke (aj keď tu sú všetky rovnako ďaleko)
      });

      const starVertices = [];
      for (let i = 0; i < 10000; i++) {
        // Počet hviezdičiek
        const x = THREE.MathUtils.randFloatSpread(200); // Náhodne rozptýlené v kocke
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(200);
        // Uisti sa, že hviezda nie je príliš blízko stredu (kde je Zem)
        if (Math.sqrt(x * x + y * y + z * z) > 50) {
          starVertices.push(x, y, z);
        }
      }

      starGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(starVertices, 3)
      );
      const stars = new THREE.Points(starGeometry, starMaterial);
      sceneRef.current.add(stars);
      // 2. Svetlá
      sceneRef.current.add(new THREE.AmbientLight(0xbbbbbb));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight.position.set(5, 3, 5);
      sceneRef.current.add(dirLight);

      // 3. Kamera
      cameraRef.current = new THREE.PerspectiveCamera(
        75,
        currentMount.clientWidth / currentMount.clientHeight,
        0.1,
        1000
      );
      cameraRef.current.position.z = 2.5;

      // 4. Renderer
      rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
      rendererRef.current.setSize(
        currentMount.clientWidth,
        currentMount.clientHeight
      );
      rendererRef.current.setPixelRatio(window.devicePixelRatio);
      currentMount.appendChild(rendererRef.current.domElement);

      // 5. OrbitControls
      controlsRef.current = new OrbitControls(
        cameraRef.current,
        rendererRef.current.domElement
      );
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.05;
      controlsRef.current.minDistance = 1.3;
      controlsRef.current.maxDistance = 10;
      // Nepovinné: nastavenie autoRotate pre overenie, či sa niečo hýbe
      // controlsRef.current.autoRotate = true;
      // controlsRef.current.autoRotateSpeed = 0.5;

      // 6. Zemeguľa
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load(
        "/earthmap.jpg",
        () => {
          console.log("Earth texture loaded.");
          if (!animationFrameId) animate(); // Spustiť len ak ešte nebeží
        },
        undefined,
        (error) => {
          console.error("Error loading Earth texture:", error);
          if (!animationFrameId) animate(); // Spustiť aj pri chybe
        }
      );
      earthTexture.colorSpace = THREE.SRGBColorSpace;

      const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.8,
        metalness: 0.1,
      });
      const earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sceneRef.current.add(earthMesh);

      // 7. Atmosféra (voliteľné)
      const atmosphereGeometry = new THREE.SphereGeometry(1.03, 64, 64);
      const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      });
      const atmosphereMesh = new THREE.Mesh(
        atmosphereGeometry,
        atmosphereMaterial
      );
      sceneRef.current.add(atmosphereMesh);

      // 8. Dátové body
      dataPointsGroupRef.current = new THREE.Group();
      const pointGeometry = new THREE.SphereGeometry(0.012, 16, 16);

      sampleData.forEach((point) => {
        const pointMaterial = new THREE.MeshBasicMaterial({
          color: defaultPointColor,
        });
        const position = latLonToCartesian(point.lat, point.lon, 1.01);
        const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
        pointMesh.position.copy(position);
        pointMesh.userData = { ...point, type: "dataPoint" };
        dataPointsGroupRef.current.add(pointMesh);
      });
      sceneRef.current.add(dataPointsGroupRef.current);
    }

    // --- Animačná slučka ---
    const animate = () => {
      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current, cameraRef.current);
      animationFrameId = requestAnimationFrame(animate);
    };

    // Spustiť animáciu, ak ešte nebeží (dôležité po načítaní textúry alebo pri HMR)
    if (!animationFrameId) {
      animate();
    }

    // --- Event Listeners ---
    const handleResize = () => {
      if (currentMount && rendererRef.current && cameraRef.current) {
        const width = currentMount.clientWidth;
        const height = currentMount.clientHeight;
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    const handleMouseMove = (event) => {
      if (
        !currentMount ||
        !cameraRef.current ||
        !dataPointsGroupRef.current ||
        !raycasterRef.current
      )
        return;

      const rect = currentMount.getBoundingClientRect();
      mouseRef.current.x =
        ((event.clientX - rect.left) / currentMount.clientWidth) * 2 - 1;
      mouseRef.current.y =
        -((event.clientY - rect.top) / currentMount.clientHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(
        dataPointsGroupRef.current.children
      );

      let intersectedPoint = null;
      if (intersects.length > 0) {
        const firstDataPoint = intersects.find(
          (intersect) => intersect.object.userData.type === "dataPoint"
        );
        if (firstDataPoint) {
          intersectedPoint = firstDataPoint.object;
        }
      }

      // Manažment hover stavu
      if (
        hoveredPointRef.current &&
        hoveredPointRef.current !== intersectedPoint
      ) {
        hoveredPointRef.current.material.color.setHex(defaultPointColor);
        if (onDataPointHover) onDataPointHover(null); // Callback môže byť null/undefined
        hoveredPointRef.current = null;
      }

      if (intersectedPoint && hoveredPointRef.current !== intersectedPoint) {
        hoveredPointRef.current = intersectedPoint;
        hoveredPointRef.current.material.color.setHex(hoverPointColor);
        if (onDataPointHover)
          onDataPointHover(hoveredPointRef.current.userData); // Callback môže byť null/undefined
      }
    };

    window.addEventListener("resize", handleResize);
    // Listener pre mousemove pridáme na currentMount, lebo canvas nemusí vyplniť celý div presne
    currentMount.addEventListener("mousemove", handleMouseMove);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null; // Resetuj ID
      window.removeEventListener("resize", handleResize);
      if (currentMount) {
        currentMount.removeEventListener("mousemove", handleMouseMove);
      }
      // Dispose controls len ak sa komponent naozaj odpojuje
      // Pri HMR ich chceme nechať žiť
      // controlsRef.current?.dispose(); // Zakomentované pre lepšie HMR

      // Tu by malo byť aj dôkladnejšie čistenie Three.js zdrojov, ak by sme to chceli 100% korektné
      // pri odpojení komponentu (unmount), ale pre HMR je jednoduchšie to nechať tak.
    };
  }, [onDataPointHover]); // Závislosť na callbacku

  // Vráti div, do ktorého sa pripojí canvas. Odstránili sme onMouseDown/Up/Leave
  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        cursor: "grab",
      }}
    />
  );
};

export default ThreeScene;
