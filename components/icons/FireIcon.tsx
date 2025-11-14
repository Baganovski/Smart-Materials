import React from 'react';

const FireIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      <path d="M12 2C9.4 4.5 8 7 8 9.5c0 2.5 2 4.5 4 4.5s4-2 4-4.5c0-2.5-1.4-5-4-7.5z" />
      <path d="M12 14s4.5 2 4.5 5.5-2.5 4.5-4.5 4.5-4.5-2-4.5-4.5S12 14 12 14z" />
    </svg>
);

export default FireIcon;