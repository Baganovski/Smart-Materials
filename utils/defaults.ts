import { StatusGroup } from "../types";

export const getDefaultStatusGroups = (): StatusGroup[] => [
  {
    id: 'default',
    name: 'Tick List',
    statuses: [
      { id: 'listed', name: 'Listed', icon: 'SquareIcon', color: '#333333' },
      { id: 'ticked', name: 'Ticked', icon: 'CheckSquareIcon', color: '#22c55e' },
    ]
  },
  {
    id: 'materials-list',
    name: 'Materials List',
    statuses: [
        { id: 'mat-listed', name: 'Listed', icon: 'SquareIcon', color: '#333333' },
        { id: 'ordered', name: 'Ordered', icon: 'ShoppingCartIcon', color: '#3b82f6' },
        { id: 'received', name: 'Received', icon: 'CheckSquareIcon', color: '#22c55e' },
        { id: 'returned', name: 'Returned', icon: 'ArrowUturnLeftIcon', color: '#ef4444' },
    ]
  }
];

export const PRESET_COLORS: string[] = [
    '#333333', // pencil
    '#9ca3af', // gray-400
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#14b8a6', // teal-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#ec4899', // pink-500
];

export const ALL_ICONS: string[] = [
    'SquareIcon',
    'CheckSquareIcon',
    'CheckCircleIcon',
    'XCircleIcon',
    'ShoppingCartIcon',
    'TruckIcon',
    'BoxIcon',
    'ArrowUturnLeftIcon',
    'StarIcon',
    'LightBulbIcon',
    'TagIcon',
    'HomeIcon',
    'CalendarDaysIcon',
    'ClockIcon',
    'PencilIcon',
];