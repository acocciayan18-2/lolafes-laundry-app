import { memo } from 'react';
import { motion } from 'framer-motion';
import { IconTrash, IconStar } from '../icons';

const PaymentMethodItem = memo(({ 
  method, 
  onToggle, 
  onSetDefault, 
  onDelete, 
  isDisabled 
}) => {
  const { id, name, isActive, isDefault } = method;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
        isActive ? "bg-slate-50 border-slate-100" : "bg-gray-50 opacity-60 border-dashed"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSetDefault(id, name)}
          disabled={isDisabled || !isActive || isDefault}
          aria-label={isDefault ? `${name} is the default method` : `Set ${name} as default`}
          className={`p-2 rounded-xl transition-all ${
            isDefault 
              ? 'bg-amber-100 text-amber-500 shadow-sm' 
              : 'text-slate-200 hover:text-amber-400 hover:bg-amber-50'
          } ${(!isActive || isDisabled) && !isDefault ? 'cursor-not-allowed opacity-30' : ''}`}
        >
          <IconStar className={`w-4 h-4 ${isDefault ? 'fill-current' : ''}`} />
        </button>
        
        <span className={` text-sm-text ${isActive ? 'text-app-dark' : 'text-slate-400 italic'}`}>
          {name}
          {isDefault && <span className="ml-2 text-nano bg-amber-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Default</span>}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Semantic Switch for Screen Readers */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={`Toggle ${name} status`}
          disabled={isDisabled}
          onClick={() => onToggle(id, name, isActive)}
          className={`relative w-9 h-5 rounded-full transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
        >
          <motion.div 
            animate={{ x: isActive ? 18 : 2 }}
            className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
          />
        </button>

        {!isDefault && (
          <button 
            type="button"
            disabled={isDisabled}
            aria-label={`Delete ${name}`}
            onClick={() => onDelete(method)}
            className="p-2 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-30"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default PaymentMethodItem;