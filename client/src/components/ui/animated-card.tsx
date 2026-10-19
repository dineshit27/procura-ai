import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AnimatedCard({ className, style, ...props }: CardProps) {
  return (
    <div
      role="region"
      aria-labelledby="card-title"
      aria-describedby="card-description"
      style={{ backgroundColor: '#ffffff', ...style }}
      className={cn(
        "group/animated-card relative w-[356px] overflow-hidden rounded-2xl border-2 border-[#111827] bg-white shadow-[3px_3px_0px_#111827] transition-all duration-300 hover:shadow-[4px_4px_0px_#111827] hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  )
}

export function CardBody({ className, style, ...props }: CardProps) {
  return (
    <div
      role="group"
      style={{ backgroundColor: '#ffffff', ...style }}
      className={cn(
        "flex flex-col space-y-1.5 border-t-2 border-[#111827]/10 p-4 bg-white",
        className
      )}
      {...props}
    />
  )
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "font-display text-lg leading-snug font-bold tracking-tight text-[#111827]",
        className
      )}
      {...props}
    />
  )
}

interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "font-sans text-sm text-[#46536B]",
        className
      )}
      {...props}
    />
  )
}

export function CardVisual({ className, style, ...props }: CardProps) {
  return (
    <div
      style={{ backgroundColor: '#ffffff', ...style }}
      className={cn("h-[180px] w-[356px] overflow-hidden bg-white", className)}
      {...props}
    />
  )
}
