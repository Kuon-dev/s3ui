'use client';

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { springPresets } from "@/lib/animations";

const buttonEnhancedVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: 
          "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm hover:shadow-md active:scale-[0.98]",
        glow:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-[0_0_20px_rgba(var(--primary)/0.5)] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      elevation: {
        none: "",
        sm: "shadow-sm hover:shadow-md",
        md: "shadow-md hover:shadow-lg",
        lg: "shadow-lg hover:shadow-xl",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      elevation: "none",
    },
  }
);

export interface ButtonEnhancedProps
  extends Omit<HTMLMotionProps<"button">, "size">,
    VariantProps<typeof buttonEnhancedVariants> {
  asChild?: boolean;
  loading?: boolean;
  ripple?: boolean;
}

const ButtonEnhanced = React.forwardRef<HTMLButtonElement, ButtonEnhancedProps>(
  ({ 
    className, 
    variant, 
    size, 
    elevation,
    asChild = false, 
    loading = false,
    ripple = true,
    children,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);
    const Comp = asChild ? Slot : motion.button;
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        
        setRipples(prev => [...prev, { x, y, id }]);
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      
      onClick?.(e);
    };
    
    return (
      <Comp
        className={cn(buttonEnhancedVariants({ variant, size, elevation, className }))}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
        transition={springPresets.gentle}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-inherit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        )}
        
        {/* Ripple effects */}
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-current opacity-30 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
        
        {/* Gradient overlay for certain variants */}
        {(variant === 'gradient' || variant === 'glow') && (
          <motion.div
            className="absolute inset-0 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            }}
          />
        )}
        
        <span className={cn("relative z-10", loading && "opacity-0")}>
          {children}
        </span>
      </Comp>
    );
  }
);

ButtonEnhanced.displayName = "ButtonEnhanced";

export { ButtonEnhanced, buttonEnhancedVariants };