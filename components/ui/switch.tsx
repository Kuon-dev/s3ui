"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  showLabels?: boolean
  onLabel?: string
  offLabel?: string
}

function Switch({
  className,
  showLabels = false,
  onLabel = "On",
  offLabel = "Off",
  ...props
}: SwitchProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  
  return (
    <div className="inline-flex items-center gap-2">
      {showLabels && (
        <motion.span
          animate={{ 
            opacity: props.checked ? 0.5 : 1,
            scale: props.checked ? 0.95 : 1
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-xs font-medium text-muted-foreground select-none"
        >
          {offLabel}
        </motion.span>
      )}
      
      <SwitchPrimitive.Root
        data-slot="switch"
        className={cn(
          "group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
          "bg-input shadow-inner",
          "transition-all duration-200 ease-in-out",
          "hover:bg-input/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=checked]:hover:bg-primary/90",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      >
        {/* Track background animation */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            backgroundColor: props.checked 
              ? "rgba(var(--primary-rgb), 0.1)" 
              : "rgba(var(--muted-rgb), 0.05)"
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
        
        {/* Thumb container for proper animation */}
        <motion.div
          className="absolute inset-0 flex items-center px-1"
          animate={{
            justifyContent: props.checked ? "flex-end" : "flex-start"
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        >
          <SwitchPrimitive.Thumb
            data-slot="switch-thumb"
            asChild
          >
            <motion.div
              className={cn(
                "relative block h-4 w-4 rounded-full",
                "bg-background shadow-sm",
                "ring-0 transition-colors duration-200",
                "group-data-[state=checked]:bg-primary-foreground"
              )}
              animate={{
                scale: isHovered ? 1.1 : 1,
                boxShadow: isHovered 
                  ? "0 2px 8px rgba(0, 0, 0, 0.15)" 
                  : "0 1px 3px rgba(0, 0, 0, 0.1)"
              }}
              transition={{
                scale: {
                  type: "spring",
                  stiffness: 400,
                  damping: 15
                },
                boxShadow: {
                  duration: 0.2
                }
              }}
            >
              {/* Inner dot for extra visual feedback */}
              <motion.div
                className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-primary/20"
                animate={{
                  scale: props.checked ? 0 : 1,
                  opacity: props.checked ? 0 : 1
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut"
                }}
              />
              
              {/* Focus ring animation */}
              <AnimatePresence>
                {isFocused && (
                  <motion.div
                    className="absolute -inset-1 rounded-full bg-primary/20"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </SwitchPrimitive.Thumb>
        </motion.div>
        
        {/* Ripple effect on click */}
        <AnimatePresence>
          {props.checked !== undefined && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ scale: 0.8, opacity: 0.3 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 0.4,
                ease: "easeOut"
              }}
              style={{
                background: props.checked 
                  ? "radial-gradient(circle, rgba(var(--primary-rgb), 0.2) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(var(--muted-rgb), 0.2) 0%, transparent 70%)"
              }}
              key={props.checked ? "on" : "off"}
            />
          )}
        </AnimatePresence>
      </SwitchPrimitive.Root>
      
      {showLabels && (
        <motion.span
          animate={{ 
            opacity: props.checked ? 1 : 0.5,
            scale: props.checked ? 1 : 0.95
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-xs font-medium text-muted-foreground select-none"
        >
          {onLabel}
        </motion.span>
      )}
    </div>
  )
}

export { Switch }