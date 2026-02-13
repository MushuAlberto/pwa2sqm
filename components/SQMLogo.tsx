
import React, { useState } from 'react';

interface SQMLogoProps {
  className?: string;
  dark?: boolean;
  width?: number | string;
  height?: number | string;
}

const LOGO_URL = "https://trabajaen.sqmlitio.com/assets/logo_sqm_border-5ca5320c418b3a044621cd4031f245b9.png";

/**
 * SQMLogo Component - Versión ultra-compacta (h-4 por defecto).
 */
export const SQMLogo: React.FC<SQMLogoProps> = ({ 
  className = "h-4", 
  dark = false,
  width = "auto",
  height = "auto"
}) => {
  const [hasError, setHasError] = useState(false);

  const textColor = dark ? "#0f172a" : "#1e293b";
  const greenPrimary = "#89B821";
  const bluePrimary = "#003595";

  if (hasError) {
    return (
      <svg 
        className={className} 
        width={width}
        height={height}
        viewBox="0 0 180 50" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      >
        <g transform="translate(5, 5)">
          <circle cx="20" cy="20" r="18" stroke={greenPrimary} strokeWidth="4.5" />
          <path d="M20 2 A18 18 0 0 1 38 20" stroke={bluePrimary} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="20" cy="20" r="7.5" fill={textColor} />
        </g>
        <text x="52" y="32" fill={textColor} style={{ fontFamily: 'Arial, sans-serif', fontWeight: 900, fontSize: '30px', letterSpacing: '-1.2px' }}>SQM</text>
        <text x="54" y="46" fill={greenPrimary} style={{ fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '11px', letterSpacing: '2.8px', textTransform: 'uppercase' }}>LITIO</text>
      </svg>
    );
  }

  return (
    <img 
      src={LOGO_URL} 
      alt="SQM Litio" 
      className={`${className} object-contain block`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height
      }}
      onError={() => setHasError(true)}
      loading="eager"
    />
  );
};

export default SQMLogo;
