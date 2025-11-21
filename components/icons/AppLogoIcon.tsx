
import React from 'react';

const AppLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Box: Yellow fill, Pencil border */}
    <rect 
        x="3" 
        y="3" 
        width="18" 
        height="18" 
        rx="4" 
        fill="#fcd34d" 
        stroke="#333333" 
        strokeWidth="2.5" 
    />
    {/* Tick: Pencil stroke */}
    <path 
        d="m8.5 12.5 2.5 2.5 5-5" 
        stroke="#333333" 
        strokeWidth="3" 
    />
  </svg>
);

export default AppLogoIcon;
