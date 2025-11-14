import React from 'react';

const ArrowDownAZIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="M20 8h-5" />
    <path d="M15 4h5v4" />
    <path d="M15 20v-5c0-1.1.9-2 2-2h3" />
    <path d="M20 20v-5" />
  </svg>
);

export default ArrowDownAZIcon;
