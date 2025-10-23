import { InputHTMLAttributes, forwardRef } from 'react';

interface YupInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const YupInput = forwardRef<HTMLInputElement, YupInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-[14px] text-[#F5F5F5]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            px-4 py-3 bg-[#1A1A1A] border border-[#374151] rounded-2xl
            text-[#F5F5F5] placeholder:text-[#9CA3AF]
            focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20
            transition-all duration-150
            ${error ? 'border-[#EF4444]' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="text-[12px] text-[#EF4444]">{error}</span>
        )}
      </div>
    );
  }
);

YupInput.displayName = 'YupInput';
