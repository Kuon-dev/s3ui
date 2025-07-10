'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { springPresets } from '@/lib/animations';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <AnimatePresence>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground',
          'shadow-md',
          className
        )}
        asChild
        {...props}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 2 }}
          transition={springPresets.snappy}
        >
          {props.children}
        </motion.div>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </AnimatePresence>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Enhanced tooltip with keyboard shortcut support
interface EnhancedTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  className?: string;
}

export function EnhancedTooltip({
  children,
  content,
  shortcut,
  side = 'top',
  delayDuration = 500,
  className,
}: EnhancedTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className={className}>
          <div className="flex items-center gap-2">
            <span>{content}</span>
            {shortcut && (
              <kbd className="ml-1 inline-flex h-5 select-none items-center gap-1 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium">
                {shortcut}
              </kbd>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };