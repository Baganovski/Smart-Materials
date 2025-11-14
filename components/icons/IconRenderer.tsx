import React from 'react';

import SquareIcon from './SquareIcon';
import CheckSquareIcon from './CheckSquareIcon';
import TruckIcon from './TruckIcon';
import ArrowUturnLeftIcon from './ArrowUturnLeftIcon';
import ShoppingCartIcon from './ShoppingCartIcon';
import PackageIcon from './PackageIcon';
import BoxIcon from './BoxIcon';
import ClipboardListIcon from './ClipboardListIcon';
import StarIcon from './StarIcon';
import XCircleIcon from './XCircleIcon';
import PencilIcon from './PencilIcon';
import CogIcon from './CogIcon';
import CalendarDaysIcon from './CalendarDaysIcon';
import ClockIcon from './ClockIcon';
import HomeIcon from './HomeIcon';
import TagIcon from './TagIcon';
import LightBulbIcon from './LightBulbIcon';
import FireIcon from './FireIcon';
import CheckCircleIcon from './CheckCircleIcon';

// Define a map from string names to icon components
const iconMap: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  SquareIcon,
  CheckSquareIcon,
  TruckIcon,
  ArrowUturnLeftIcon,
  ShoppingCartIcon,
  PackageIcon,
  BoxIcon,
  ClipboardListIcon,
  StarIcon,
  XCircleIcon,
  PencilIcon,
  CogIcon,
  CalendarDaysIcon,
  ClockIcon,
  HomeIcon,
  TagIcon,
  LightBulbIcon,
  FireIcon,
  CheckCircleIcon,
};

interface IconRendererProps extends React.SVGProps<SVGSVGElement> {
  iconName: string;
}

const IconRenderer: React.FC<IconRendererProps> = ({ iconName, ...props }) => {
  const IconComponent = iconMap[iconName] || SquareIcon; // Default to SquareIcon if not found
  return <IconComponent {...props} />;
};

export default IconRenderer;