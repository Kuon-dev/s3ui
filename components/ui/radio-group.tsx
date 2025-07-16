"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

interface RadioGroupItemProps extends React.ComponentProps<typeof RadioGroupPrimitive.Item> {
  id?: string
}

function RadioGroupItem({
  className,
  id,
  ...props
}: RadioGroupItemProps) {
  const generatedId = React.useId()
  const itemId = id || generatedId
  
  return (
    <RadioGroupPrimitive.Item
      id={itemId}
      data-slot="radio-group-item"
      className={cn(
        "group relative aspect-square h-3 w-3 shrink-0 rounded-full",
        "border border-input bg-background",
        "transition-all duration-200",
        "hover:border-muted-foreground/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
        asChild
      >
        <motion.div
          className="h-full w-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            mass: 0.8
          }}
        >
          <div className="h-1 w-1 rounded-full bg-background" />
        </motion.div>
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

// Minimalist Radio Group Item with Label
interface RadioGroupItemWithLabelProps {
  value: string
  label: string
  description?: string
  className?: string
}

function RadioGroupItemWithLabel({
  value,
  label,
  description,
  className,
}: RadioGroupItemWithLabelProps) {
  const id = React.useId()
  
  return (
    <div
      className={cn(
        "flex items-start gap-2 py-1",
        className
      )}
    >
      <RadioGroupItem
        value={value}
        id={id}
        className="mt-1"
      />
      <label
        htmlFor={id}
        className="flex-1 cursor-pointer select-none"
      >
        <div className="text-sm font-medium leading-none">
          {label}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </label>
    </div>
  )
}

// Card-style Radio Group Item (Mac-OS inspired)
interface RadioGroupCardProps {
  value: string
  title: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

function RadioGroupCard({
  value,
  title,
  description,
  icon,
  className,
}: RadioGroupCardProps) {
  const id = React.useId()
  const [isSelected, setIsSelected] = React.useState(false)
  
  return (
    <RadioGroupPrimitive.Item
      value={value}
      id={id}
      className={cn(
        "group relative rounded-lg border bg-card p-3",
        "transition-all duration-200",
        "hover:border-muted-foreground/50 hover:bg-accent/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary/5",
        className
      )}
      onCheckedChange={(checked) => setIsSelected(checked)}
      asChild
    >
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 20
        }}
      >
        <div className="flex items-start gap-2">
          {icon && (
            <div className="mt-0.5 text-muted-foreground group-data-[state=checked]:text-primary">
              {icon}
            </div>
          )}
          <div className="flex-1 space-y-1">
            <label htmlFor={id} className="text-sm font-medium cursor-pointer">
              {title}
            </label>
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className="relative h-3 w-3">
            <div className={cn(
              "absolute inset-0 rounded-full border",
              "transition-all duration-200",
              "group-hover:border-muted-foreground/70",
              "group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary"
            )}>
              <RadioGroupPrimitive.Indicator className="flex items-center justify-center" asChild>
                <motion.div
                  className="h-full w-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  <div className="h-1 w-1 rounded-full bg-background" />
                </motion.div>
              </RadioGroupPrimitive.Indicator>
            </div>
          </div>
        </div>
      </motion.div>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupItemWithLabel, RadioGroupCard }