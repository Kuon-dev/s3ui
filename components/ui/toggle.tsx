"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { motion, AnimatePresence } from "motion/react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-transparent data-[state=on]:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3 min-w-9",
        sm: "h-8 px-2 min-w-8 text-xs",
        lg: "h-10 px-4 min-w-10",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ToggleProps
  extends React.ComponentProps<typeof TogglePrimitive.Root>,
    VariantProps<typeof toggleVariants> {
  showRipple?: boolean
}

function Toggle({
  className,
  variant,
  size,
  showRipple = true,
  children,
  ...props
}: ToggleProps) {
  const [isPressed, setIsPressed] = React.useState(false)
  const [rippleKey, setRippleKey] = React.useState(0)
  
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      onMouseDown={() => {
        setIsPressed(true)
        setRippleKey(prev => prev + 1)
      }}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      {...props}
    >
      {/* Background transition layer */}
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        animate={{
          backgroundColor: props.pressed
            ? "rgba(var(--accent-rgb, 147, 197, 253), 0.15)"
            : "transparent",
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      />
      
      {/* Ripple effect */}
      {showRipple && (
        <AnimatePresence>
          {isPressed && (
            <motion.div
              key={rippleKey}
              className="absolute inset-0 rounded-[inherit] pointer-events-none"
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.6,
                ease: "easeOut"
              }}
              style={{
                background: "radial-gradient(circle, currentColor 10%, transparent 70%)"
              }}
            />
          )}
        </AnimatePresence>
      )}
      
      {/* Scale animation wrapper */}
      <motion.div
        className="relative z-10 inline-flex items-center justify-center gap-2"
        animate={{
          scale: isPressed ? 0.97 : 1
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15
        }}
      >
        {/* Icon/content animation */}
        <motion.div
          animate={{
            rotate: props.pressed ? 180 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        >
          {children}
        </motion.div>
      </motion.div>
      
      {/* Focus highlight */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        animate={{
          boxShadow: props.pressed
            ? "inset 0 0 0 1px rgba(var(--accent-rgb, 147, 197, 253), 0.2)"
            : "inset 0 0 0 0px transparent"
        }}
        transition={{ duration: 0.2 }}
      />
    </TogglePrimitive.Root>
  )
}

export { Toggle, toggleVariants }