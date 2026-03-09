import { IconLoading } from '../icons';

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  type = 'button',
  disabled = false,
  isLoading = false,
  className = '',
  ...props 
}) {
  
  const baseStyles = "px-4 py-3 md:text-sm text-sm-text font-medium rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-app-dark text-white border border-app-dark hover:bg-app-dark/90",
    
    secondary: "border border-app-dark text-app-dark bg-transparent hover:bg-app-dark/5",
    
    danger: "bg-rose-500 text-white border border-rose-500 hover:bg-rose-600",

    success: "bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-100"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading && <IconLoading className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}