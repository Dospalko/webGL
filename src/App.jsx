import React, { useState } from 'react';
import ThreeScene from './ThreeScene';
import SampleData from './data/locations.json' // Rovnaké dáta môžeme použiť aj tu

function App() {
  const [hoveredData, setHoveredData] = useState(null);

  // Funkcia, ktorú pošleme do ThreeScene
  const handleDataPointHover = (data) => {
    setHoveredData(data);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Three.js scéna zaberie celý priestor */}
      <ThreeScene onDataPointHover={handleDataPointHover} />

      {/* Legenda (jednoduchý príklad) */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <b>Legenda</b><br/>
        <span style={{color: 'red'}}>■</span> Dáta Bod
        {/* Tu by mohli byť ďalšie vysvetlivky */}
      </div>

       {/* Panel s detailmi */}
      {hoveredData && (
          <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '15px',
              borderRadius: '8px',
              fontSize: '14px',
              maxWidth: '200px',
          }}>
              <h3>{hoveredData.name}</h3>
              <p>Lat: {hoveredData.lat.toFixed(4)}</p>
              <p>Lon: {hoveredData.lon.toFixed(4)}</p>
              <p>Hodnota: {hoveredData.value}</p>
          </div>
      )}

    </div>
  );
}

export default App;