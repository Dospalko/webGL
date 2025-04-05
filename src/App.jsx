import React, { useState } from 'react';
import ThreeScene from './ThreeScene';
// CSS môžeš naimportovať tu alebo v index.js/main.jsx
// import './App.css'; // Ak máš špecifické štýly pre App

function App() {
  const [hoveredData, setHoveredData] = useState(null);

  // Callback funkcia, ktorú zavolá ThreeScene pri hovernutí
  const handleDataPointHover = (data) => {
    setHoveredData(data);
  };

  // Štýly pre UI prvky môžeme definovať priamo tu alebo v CSS súbore
  const overlayStyleBase = {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'sans-serif',
    pointerEvents: 'none', // Aby neblokovali interakciu s canvasom pod nimi
    userSelect: 'none', // Aby sa text nedal označiť
    lineHeight: '1.4',
  };

  const legendStyle = {
    ...overlayStyleBase,
    top: '20px',
    right: '20px',
  };

  const detailsPanelStyle = {
    ...overlayStyleBase,
    bottom: '20px',
    left: '20px',
    maxWidth: '220px',
    // Podmienené zobrazenie pomocou opacity a visibility pre plynulejší prechod
    opacity: hoveredData ? 1 : 0,
    visibility: hoveredData ? 'visible' : 'hidden',
    transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out',
  };

  const legendItemStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  };

  const legendColorStyle = {
    width: '12px',
    height: '12px',
    marginRight: '8px',
    border: '1px solid #666',
    display: 'inline-block', // Aby sa zobrazil ako štvorec
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Three.js scéna zaberie celý priestor */}
      <ThreeScene onDataPointHover={handleDataPointHover} />

      {/* Legenda */}
      <div style={legendStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Legenda</div>
        <div style={legendItemStyle}>
          <span style={{ ...legendColorStyle, backgroundColor: '#ff0000' }}></span> Lokácia
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendColorStyle, backgroundColor: '#ffff00' }}></span> Zvýraznená
        </div>
      </div>

      {/* Panel s detailmi */}
      <div style={detailsPanelStyle}>
        {hoveredData && ( // Renderuj obsah len ak sú dáta
          <>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1em' }}>
              {hoveredData.name}
            </h3>
            <p style={{ margin: '3px 0', fontSize: '0.9em' }}>Lat: {hoveredData.lat.toFixed(4)}</p>
            <p style={{ margin: '3px 0', fontSize: '0.9em' }}>Lon: {hoveredData.lon.toFixed(4)}</p>
            <p style={{ margin: '3px 0', fontSize: '0.9em' }}>Hodnota: {hoveredData.value}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default App;