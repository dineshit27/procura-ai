import React from 'react';
import { useReveal } from './useReveal';
import SynthexHero from '@/components/ui/synthex-hero';
import {
  AnimatedCard,
  CardBody,
  CardTitle,
  CardVisual,
} from '@/components/ui/animated-card';
import { Visual1 } from '@/components/ui/visual-1';
import { Visual2 } from '@/components/ui/visual-2';
import { Visual3 } from '@/components/ui/visual-3';
import { MarqueeLogoScroller } from '@/components/ui/marquee-logo-scroller';

const PROCUREMENT_LOGOS = [
  {
    src: 'https://cdn.simpleicons.org/amazon/ff9900',
    alt: 'Amazon',
    gradient: { from: '#fed7aa', via: '#f97316', to: '#c2410c' },
  },
  {
    src: 'https://cdn.simpleicons.org/flipkart/2874f0',
    alt: 'Flipkart',
    gradient: { from: '#93c5fd', via: '#2874f0', to: '#1e40af' },
  },
  {
    src: 'https://cdn.simpleicons.org/swiggy/f97316',
    alt: 'Swiggy',
    gradient: { from: '#fed7aa', via: '#f97316', to: '#c2410c' },
  },
  {
    src: 'https://cdn.simpleicons.org/meesho/f43f5e',
    alt: 'Meesho',
    gradient: { from: '#fecdd3', via: '#f43f5e', to: '#be123c' },
  },
  {
    src: 'https://cdn.simpleicons.org/shopify/95bf47',
    alt: 'Shopify',
    gradient: { from: '#bef264', via: '#65a30d', to: '#3f6212' },
  },
  {
    src: 'https://cdn.simpleicons.org/instacart/43b02a',
    alt: 'Instacart',
    gradient: { from: '#bbf7d0', via: '#43b02a', to: '#166534' },
  },
  {
    src: 'https://cdn.simpleicons.org/ubereats/06c167',
    alt: 'Uber Eats',
    gradient: { from: '#bbf7d0', via: '#06c167', to: '#047857' },
  },
  {
    src: 'https://cdn.simpleicons.org/razorpay/3395ff',
    alt: 'Razorpay',
    gradient: { from: '#bfdbfe', via: '#3395ff', to: '#1d4ed8' },
  },
] as const;

export const LandingHero: React.FC = () => {
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <section className="landing-hero" id="top">
      <SynthexHero />

      <div ref={revealRef} className="reveal landing-wrap relative z-[1] landing-grid-fade pt-8 pb-8 px-2 sm:px-10">
        <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:items-start">
          <AnimatedCard>
            <CardVisual>
              <Visual1 mainColor="#3b82f6" secondaryColor="#1d4ed8" />
            </CardVisual>
            <CardBody>
              <CardTitle>Describe the purchase</CardTitle>
            </CardBody>
          </AnimatedCard>
          <AnimatedCard>
            <CardVisual>
              <Visual2 mainColor="#3b82f6" secondaryColor="#1d4ed8" />
            </CardVisual>
            <CardBody>
              <CardTitle>Compare better options</CardTitle>
            </CardBody>
          </AnimatedCard>
          <AnimatedCard>
            <CardVisual>
              <Visual3 mainColor="#3b82f6" secondaryColor="#1d4ed8" />
            </CardVisual>
            <CardBody>
              <CardTitle>Control the checkout</CardTitle>
            </CardBody>
          </AnimatedCard>
        </div>
      </div>

      <div className="landing-wrap relative z-[1] pb-12 pt-4 sm:pb-16">
        <MarqueeLogoScroller
          title="One procurement layer for every marketplace"
          description="Procura can connect your purchasing workflow with platforms such as Amazon, Flipkart, Swiggy, Meesho, and more—so teams can compare options, enforce policy, and keep every order traceable."
          logos={[...PROCUREMENT_LOGOS]}
          speed="normal"
          className="bg-white/80"
        />
      </div>
    </section>
  );
};
