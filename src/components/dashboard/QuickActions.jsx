import { Link } from 'react-router-dom';
import { IconAddNewOrder, IconUsers } from '../icons';

export default function QuickActions() {
  // 1. PERFORMANCE (DRY Principle): 
  // Extracting common classes makes the component lighter, easier to maintain, 
  // and prevents you from having to update styling in multiple places.
  // Note: I removed 'border-1' as 'border' natively handles the 1px width in Tailwind.
  const actionButtonClasses = "group flex items-center justify-center w-9 h-9 shadow-md bg-white  active:bg-app-dark/5 rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-app-dark/20";

  return (
    <div 
      className="flex items-center gap-1.5" 
      role="group" 
      aria-label="Quick Navigation Actions"
    >
      {/* 2. VALIDATION & ACCESSIBILITY: 
          - Applied classes directly to the Link instead of wrapping a <button>.
          - Added aria-label for screen readers.
          - Added title for a native hover tooltip since these are icon-only buttons.
      */}
      <Link 
        to="/main/neworder"
        className={actionButtonClasses}
        aria-label="Create New Order"
        title="Create New Order"
      >
        <IconAddNewOrder className="w-5 h-5" aria-hidden="true" />
      </Link>

      <Link 
        to="/main/customers"
        className={actionButtonClasses}
        aria-label="View Customers Directory"
        title="View Customers"
      >
        <IconUsers className="w-4 h-4" aria-hidden="true" />
      </Link>
    </div>
  );
}