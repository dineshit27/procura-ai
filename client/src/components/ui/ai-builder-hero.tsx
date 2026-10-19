"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "motion/react";

const videoSrc =
  "https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8";
const poster =
  "https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1dHJhbCUyMG5ldHdvcmt8ZW5vfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080";

export default function AiBuilderHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | undefined;
    const playVideo = () => {
      video.play().catch(() => undefined);
    };

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, playVideo);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoSrc;
      video.addEventListener("loadedmetadata", playVideo);
    }

    return () => {
      hls?.destroy();
      video.removeEventListener("loadedmetadata", playVideo);
    };
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-black font-['Instrument_Sans'] text-white">
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="absolute top-[-20%] left-[20%] size-[600px] rounded-full bg-blue-900/20 blur-[120px] mix-blend-screen" />
      <div className="absolute right-[20%] bottom-[-10%] size-[500px] rounded-full bg-indigo-900/20 blur-[120px] mix-blend-screen" />

      <nav className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-transparent px-6 py-4">
        <a href="#top" aria-label="Procura home" className="text-2xl text-white">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6 fill-white"
          >
            <path d="m12 1 1.25 7.65L18.5 3.5l-3.15 6.05L23 8.5l-7.2 3.5L23 15.5l-7.65-1.25L18.5 20.5l-6.05-3.15L12 24l-1.25-6.65L5.5 20.5l3.15-6.05L1 15.5l7.2-3.5L1 8.5l7.65 1.25L5.5 3.5l6.05 3.15L12 1Z" />
          </svg>
        </a>
        <div className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
          <a href="#product" className="transition-colors hover:text-white">
            Products <ChevronDown className="ml-1 inline size-4" />
          </a>
          <a href="#workflow" className="transition-colors hover:text-white">
            Customer Stories
          </a>
          <a href="#resources" className="transition-colors hover:text-white">
            Resources
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-5 text-sm font-medium">
          <a href="/app" className="hidden text-white/80 transition-colors hover:text-white sm:block">
            Book A Demo
          </a>
          <a
            href="/app"
            className="rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform hover:scale-105"
          >
            Get Started
          </a>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center space-y-12 px-6 pt-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-['Instrument_Serif'] text-3xl leading-[1.1] sm:text-5xl lg:text-[48px]"
        >
          Design at the speed of thought
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-gradient-to-b from-white via-white to-[#b4c0ff] bg-clip-text text-6xl leading-[0.9] tracking-tighter text-transparent sm:text-8xl lg:text-[136px] font-semibold"
        >
          Build Faster
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="max-w-xl text-lg leading-[1.65] text-white sm:text-[20px]"
        >
          Create fully functional, SEO-optimized websites in seconds with our
          advanced AI engine.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col items-center gap-6 sm:flex-row"
        >
          <a
            href="/app"
            className="group flex items-center gap-4 rounded-full bg-white py-2 pl-6 pr-2 text-lg font-medium text-[#0a0400] transition-transform hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            Start Building Free
            <span className="flex size-10 items-center justify-center rounded-full bg-[#3054ff] transition-colors group-hover:bg-[#2040e0]">
              <ArrowRight className="size-5 text-white" />
            </span>
          </a>
          <a
            href="#product"
            className="group flex items-center gap-2 rounded-lg px-4 py-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/5 hover:text-white"
          >
            See Examples
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
        <a
          href="#product"
          className="absolute bottom-7 flex flex-col items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          Explore the workflow
          <ChevronDown className="size-4" />
        </a>
      </div>
    </section>
  );
}
