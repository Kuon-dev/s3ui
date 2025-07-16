'use client';

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { springPresets } from "@/lib/animations";

export interface CardEnhancedProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  interactive?: boolean;
  glow?: boolean;
}

const CardEnhanced = React.forwardRef<HTMLDivElement, CardEnhancedProps>(
  ({ className, variant = 'default', interactive = false, glow = false, children, ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);
    
    const variants = {
      default: "bg-card border border-border/50",
      elevated: "bg-card shadow-lg border border-border/30",
      glass: "bg-background/50 backdrop-blur-md border border-border/30",
      gradient: "bg-gradient-to-br from-card via-card to-accent/5 border border-border/30"
    };
    
    const MotionDiv = interactive ? motion.div : 'div';
    const interactiveProps = interactive ? {
      whileHover: { scale: 1.02, y: -4 },
      whileTap: { scale: 0.98 },
      transition: springPresets.bouncy,
      onHoverStart: () => setIsHovered(true),
      onHoverEnd: () => setIsHovered(false),
    } : {};
    
    return (
      <MotionDiv
        ref={ref}
        className={cn(
          "rounded-xl transition-all duration-300 relative overflow-hidden",
          variants[variant],
          interactive && "cursor-pointer hover:shadow-xl",
          glow && "before:absolute before:inset-0 before:p-[1px] before:rounded-xl before:-z-10 before:bg-gradient-to-br before:from-accent/20 before:via-transparent before:to-accent/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
          className
        )}
        {...interactiveProps}
        {...props}
      >
        {/* Subtle gradient overlay for depth */}
        {variant === 'elevated' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
        )}
        
        {/* Animated glow effect */}
        {glow && isHovered && (
          <motion.div
            className="absolute inset-0 opacity-30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent blur-xl" />
          </motion.div>
        )}
        
        {children}
      </MotionDiv>
    );
  }
);

CardEnhanced.displayName = "CardEnhanced";

const CardEnhancedHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pb-4", className)}
    {...props}
  />
));

CardEnhancedHeader.displayName = "CardEnhancedHeader";

const CardEnhancedTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));

CardEnhancedTitle.displayName = "CardEnhancedTitle";

const CardEnhancedDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground mt-1.5", className)}
    {...props}
  />
));

CardEnhancedDescription.displayName = "CardEnhancedDescription";

const CardEnhancedContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));

CardEnhancedContent.displayName = "CardEnhancedContent";

const CardEnhancedFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));

CardEnhancedFooter.displayName = "CardEnhancedFooter";

export {
  CardEnhanced,
  CardEnhancedHeader,
  CardEnhancedFooter,
  CardEnhancedTitle,
  CardEnhancedDescription,
  CardEnhancedContent,
};