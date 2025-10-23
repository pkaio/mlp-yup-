import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function ButtonPrimary({ children, fullWidth, className = '', ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, backgroundColor: '#FF8533' }}
      whileTap={{ scale: 0.98 }}
      className={`
        px-6 py-3 bg-[#FF6B00] text-[#F5F5F5] rounded-2xl
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function ButtonGhost({ children, fullWidth, className = '', ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        px-6 py-3 bg-transparent border-2 border-[#FF6B00] text-[#FF6B00] rounded-2xl
        transition-all duration-150 hover:bg-[#FF6B00]/10
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}
