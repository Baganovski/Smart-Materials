import React from 'react';

const LightBulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-7 7c0 3.03 1.25 4.67 3.25 6.42.5.44 1.25.96 1.25 1.58V18h5v-1c0-.62.75-1.14 1.25-1.58C17.75 13.67 19 12.03 19 9a7 7 0 0 0-7-7z" />
  </svg>
);

export default LightBulbIcon;