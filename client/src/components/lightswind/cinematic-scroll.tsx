"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { cn } from "../../lib/utils";

interface CinematicScrollProps {
  children: React.ReactNode;
  className?: string;
  blurLayers?: number;
  blurMax?: number;
  blurSize?: number;
  accentColor?: string;
  showScrollbar?: boolean;
  enableTopBlur?: boolean;
  enableBottomBlur?: boolean;
}

export const CinematicScroll = ({
  children,
  className,
  blurLayers = 5,
  blurMax = 20,
  blurSize = 80,
  accentColor = "#3b82f6",
  showScrollbar = true,
  enableTopBlur = false,
  enableBottomBlur = true,
}: CinematicScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  const { scrollYProgress } = useScroll({ container: scrollerRef });
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const scroller = scrollerRef.current;
    const footer = scroller?.querySelector<HTMLElement>("[data-cinematic-scroll-footer]");
    if (!scroller || !footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { root: scroller, threshold: 0 },
    );
    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  const blurMask = (side: "top" | "bottom") => (
    <div
      className={cn(
        "pointer-events-none absolute right-0 left-0 z-30 overflow-hidden",
        side === "top" ? "top-0" : "bottom-0 rotate-180",
      )}
      style={{ height: blurSize }}
    >
      {Array.from({ length: blurLayers }, (_, index) => (
        <div
          key={`${side}-${index}`}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${Math.sin(((blurLayers - (index + 1)) / blurLayers) * Math.PI / 2) * blurMax}px)`,
            maskImage: `linear-gradient(to bottom, black, transparent ${((index + 1) / blurLayers) * 100}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, black, transparent ${((index + 1) / blurLayers) * 100}%)`,
          }}
        />
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden bg-transparent",
        className,
      )}
      style={
        {
          "--blur-max": blurMax,
          "--blur-size": blurSize,
          "--accent": accentColor,
        } as React.CSSProperties
      }
    >
      {enableTopBlur && blurMask("top")}
      {enableBottomBlur && blurMask("bottom")}

      {showScrollbar && (
        <motion.div
          className="pointer-events-none absolute top-2 right-0 bottom-2 z-40 hidden w-1.5 sm:block"
          animate={{ opacity: footerVisible ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        >
          <motion.div
            className="origin-top rounded-full"
            style={{
              scaleY,
              height: "100%",
              background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}dd)`,
              boxShadow: `0 0 10px ${accentColor}44`,
            }}
          />
        </motion.div>
      )}

      <div
        ref={scrollerRef}
        className="cinematic-scroll h-full w-full overflow-x-hidden overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
    </div>
  );
};

export default CinematicScroll;
