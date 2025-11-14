import { CustomStatus } from "../types";

export const getDefaultStatuses = (): CustomStatus[] => [
  { id: 'listed', name: 'Listed', icon: 'SquareIcon' },
  { id: 'ordered', name: 'Ordered', icon: 'TruckIcon' },
  { id: 'collected', name: 'Collected', icon: 'CheckSquareIcon' },
  { id: 'returned', name: 'Returned', icon: 'ArrowUturnLeftIcon' },
];

export const ALL_ICONS: string[] = [
    'SquareIcon',
    'CheckSquareIcon',
    'CheckCircleIcon',
    'XCircleIcon',
    'TruckIcon',
    'ShoppingCartIcon',
    'PackageIcon',
    'BoxIcon',
    'ArrowUturnLeftIcon',
    'ClipboardListIcon',
    'StarIcon',
    'FireIcon',
    'LightBulbIcon',
    'TagIcon',
    'HomeIcon',
    'CalendarDaysIcon',
    'ClockIcon',
    'PencilIcon',
    'CogIcon'
];