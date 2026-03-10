import { Link } from 'react-router-dom';
import { IconPlus, IconUsers } from '../icons';

// ----------------------------------------------------------------------
// CONFIGURATION & STYLES
// Extracted outside the component to prevent memory reallocation on every re-render
// ----------------------------------------------------------------------

const ACTION_BUTTON_CLASSES = "group flex items-center justify-center w-9 h-9 shadow-md bg-white active:bg-app-dark/5 rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-app-dark/20";

const QUICK_ACTIONS = [
  {
    id: 'new-order',
    path: '/main/neworder',
    label: 'Create New Order',
    icon: IconPlus,
  },
  {
    id: 'customers',
    path: '/main/customers',
    label: 'View Customers Directory',
    icon: IconUsers,
  }
];

export default function QuickActions() {
  return (
    <nav 
      className="flex items-center gap-1.5" 
      aria-label="Quick Navigation Actions"
    >
      {QUICK_ACTIONS.map(({ id, path, label, icon: Icon }) => (
        <Link 
          key={id}
          to={path}
          className={ACTION_BUTTON_CLASSES}
          aria-label={label}
          title={label} // Provides a native browser tooltip on hover
          // Prevent default drag behavior which can accidentally trigger on touch devices
          onDragStart={(e) => e.preventDefault()} 
        >
          {/* Defensive rendering: ensures the app doesn't crash if an icon is missing */}
          {Icon ? <Icon className="w-4 h-4 text-text-dark" aria-hidden="true" /> : null}
        </Link>
      ))}
    </nav>
  );
}