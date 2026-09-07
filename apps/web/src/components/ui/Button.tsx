import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Spinner } from './Spinner.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';

    const variantClasses = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500 shadow-sm shadow-indigo-500/20',
      secondary:
        'bg-slate-700 text-white hover:bg-slate-600 active:bg-slate-800 focus-visible:ring-slate-500',
      outline:
        'border border-slate-600 text-slate-200 hover:bg-slate-800 active:bg-slate-700 focus-visible:ring-indigo-500',
      ghost:
        'text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700 focus-visible:ring-indigo-500',
      destructive:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm shadow-rose-500/20',
    };

    const sizeClasses = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {isLoading && <Spinner size="sm" className="text-current" />}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
