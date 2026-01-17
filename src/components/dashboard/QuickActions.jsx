import { Link } from 'react-router-dom';
import { IconAddNewOrder, IconUsers } from '../icons';

export default function QuickActions() {
  // Common classes updated to use transition between your new specific tokens
  
  return (
    <div className="flex items-center gap-1.5">
      {/* 1. NEW ORDER BUTTON - Updated to high-contrast Dark theme */}
      <Link to="/main/neworder">
        <button className="group flex items-center justify-center w-9 shadow-md h-9 hover:bg-app-dark/5 active:bg-app-dark/5 bg-white rounded-xl border border-1 border-text-dark/20 active:scale-95 transition-all duration-200 ">
          <IconAddNewOrder className="w-5 h-5 " />
        </button>
      </Link>

      {/* 2. CUSTOMERS BUTTON - Updated to Light theme with Dark text */}
      <Link to="/main/customers">
        <button className="group flex items-center justify-center w-9 h-9 shadow-md bg-white hover:bg-app-dark/5 active:bg-app-dark/5 rounded-xl border border-1 border-text-dark/20 active:scale-95 transition-all duration-200 ">
          <IconUsers className="w-4 h-4 " />
        </button>
      </Link>
    </div>
  );
}