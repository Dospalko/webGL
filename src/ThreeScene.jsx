import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import sampleData from './data/locations.json'; // Import dát

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
    const sceneRef = useRef(); // Ref pre scénu, ak ju potrebujeme mimo useEffect
    const rendererRef = useRef(); // Ref pre renderer
    const cameraRef = useRef(); // Ref pre kameru
    const raycasterRef = useRef(new THREE.Raycaster()); // Ref pre raycaster
    const mouseRef = useRef(new THREE.Vector2()); // Ref pre pozíciu myši
    const dataPointsGroupRef = useRef(); // Ref pre skupinu dátových bodov
    const hoveredPointRef = useRef(null); // Ref pre aktuálne hovernutý bod

    // Farby pre vizualizáciu
    const defaultPointColor = 0xff0000; // Červená
    const hoverPointColor = 0xffff00;   // Žltá

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return; // Počkať, kým je mount div pripravený

        let animationFrameId;

        // --- Inicializácia (iba ak ešte neexistuje renderer) ---
        // Toto zabraňuje opätovnej inicializácii pri HMR (Hot Module Replacement)
        if (!rendererRef.current) {
            // 1. Scéna
            sceneRef.current = new THREE.Scene();
            sceneRef.current.background = new THREE.Color(0x111111); // Tmavé pozadie pre istotu

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
            rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
            rendererRef.current.setPixelRatio(window.devicePixelRatio); // Pre ostrejší obraz na HiDPI
            currentMount.appendChild(rendererRef.current.domElement);

            // 5. OrbitControls
            controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
            controlsRef.current.enableDamping = true;
            controlsRef.current.dampingFactor = 0.05;
            controlsRef.current.minDistance = 1.3;
            controlsRef.current.maxDistance = 10;

            // 6. Zemeguľa
            const textureLoader = new THREE.TextureLoader();
            const earthTexture = textureLoader.load('/earthmap.jpg', () => {
                 // Textúra sa načítala, môžeme spustiť animáciu
                 console.log("Earth texture loaded.");
                 animate(); // Začni animáciu až po načítaní textúry
            }, undefined, (error) => {
                console.error('Error loading Earth texture:', error);
                // Ak textúra zlyhá, stále môžeme spustiť animáciu s čiernou guľou
                 animate();
            });
            earthTexture.colorSpace = THREE.SRGBColorSpace; // Správny farebný priestor

            const sphereGeometry = new THREE.SphereGeometry(1, 64, 64); // Vyššia kvalita gule
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
                color: 0x87ceeb, // Svetlo modrá
                transparent: true,
                opacity: 0.15,
                side: THREE.BackSide
            });
            const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            sceneRef.current.add(atmosphereMesh);

            // 8. Dátové body
            dataPointsGroupRef.current = new THREE.Group();
            const pointGeometry = new THREE.SphereGeometry(0.012, 16, 16); // Veľkosť markeru

            sampleData.forEach(point => {
                // Vytvoríme unikátny materiál pre každý bod, aby sme mohli meniť farbu
                const pointMaterial = new THREE.MeshBasicMaterial({ color: defaultPointColor });
                const position = latLonToCartesian(point.lat, point.lon, 1.01); // Mierne nad povrchom
                const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                pointMesh.position.copy(position);
                pointMesh.userData = { ...point, type: 'dataPoint' }; // Uložíme všetky dáta + typ
                dataPointsGroupRef.current.add(pointMesh);
            });
            sceneRef.current.add(dataPointsGroupRef.current);
        }


        // --- Animačná slučka ---
        const animate = () => {
            // ?. pre istotu, ak by sa referencie ešte nenastavili (napr. pri rýchlom HMR)
            controlsRef.current?.update();
            rendererRef.current?.render(sceneRef.current, cameraRef.current);
            animationFrameId = requestAnimationFrame(animate);
        };

        // Ak už renderer existuje (napr. pri HMR alebo ak textúra nebola nájdená),
        // rovno spusti animáciu (alebo pokračuj v nej)
        if (rendererRef.current && !animationFrameId) {
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
            if (!currentMount || !cameraRef.current || !dataPointsGroupRef.current || !raycasterRef.current) return;

            // Normalizuj pozíciu myši
            const rect = currentMount.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / currentMount.clientWidth) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / currentMount.clientHeight) * 2 + 1;

            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
            const intersects = raycasterRef.current.intersectObjects(dataPointsGroupRef.current.children);

            let intersectedPoint = null;
            if (intersects.length > 0) {
                 // Nájdeme prvý objekt, ktorý je naozaj dátový bod
                 const firstDataPoint = intersects.find(intersect => intersect.object.userData.type === 'dataPoint');
                 if (firstDataPoint) {
                     intersectedPoint = firstDataPoint.object;
                 }
            }

            // Manažment hover stavu
            if (hoveredPointRef.current && hoveredPointRef.current !== intersectedPoint) {
                // Opúšťame predtým hovernutý bod
                hoveredPointRef.current.material.color.setHex(defaultPointColor);
                onDataPointHover(null); // Informuj React
                hoveredPointRef.current = null;
            }

            if (intersectedPoint && hoveredPointRef.current !== intersectedPoint) {
                // Vstupujeme na nový bod
                hoveredPointRef.current = intersectedPoint;
                hoveredPointRef.current.material.color.setHex(hoverPointColor);
                onDataPointHover(hoveredPointRef.current.userData); // Informuj React
            }
        };

        window.addEventListener('resize', handleResize);
        currentMount.addEventListener('mousemove', handleMouseMove);

        // --- Cleanup ---
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            // Odstránime listener z mount elementu LEN AK existuje
            if(currentMount){
                currentMount.removeEventListener('mousemove', handleMouseMove);
            }

            // Dispose controls AK existujú
            controlsRef.current?.dispose();

            // **Poznámka k čisteniu pri HMR:**
            // V jednoduchom prípade môžeme nechať Three.js scénu žiť medzi HMR aktualizáciami.
            // Ak by sme chceli VŽDY všetko zničiť a postaviť nanovo, museli by sme
            // implementovať dôkladnejšie čistenie VŠETKÝCH Three.js zdrojov
            // (geometrie, materiály, textúry, renderer, scéna) a odstrániť
            // `if (!rendererRef.current)` check na začiatku useEffect.
            // Pre tento príklad to necháme zjednodušené.
        };

    }, [onDataPointHover]); // Znovu spustiť useEffect len ak sa zmení callback

    // Vráti div, do ktorého sa pripojí canvas
    return (
        <div
            ref={mountRef}
            style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
            // Zmena kurzora pre lepšiu UX pri otáčaní
            onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
            onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
            onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'} // Ak myš opustí canvas
        />
    );
};

export default ThreeScene;