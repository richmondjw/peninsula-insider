/**
 * ScrollReveal — Subtle fade-up reveal for content sections as they enter the
 * viewport. Used to give the homepage a quiet sense of motion without
 * theatrics. Each section's first paint is delayed by a few hundred ms after
 * the section crosses the viewport edge, so the page feels like it's
 * "settling in" rather than appearing all at once.
 *
 * Optional stagger animates direct children one-by-one — useful for card
 * grids (places, plans, shortlist items) where the cascade reads as
 * editorial polish rather than animation-for-its-own-sake.
 *
 * Respects prefers-reduced-motion (Framer Motion does this natively when
 * MotionConfig is in place — see ../react/motion-config wrapper). At the
 * page level we keep the wrapper light: Framer reads the media query and
 * collapses durations to 0.
 *
 * Why an island and not pure CSS:
 *   - whileInView gives us "animate once, when in view" with no boilerplate
 *   - stagger choreography is non-trivial to express in CSS for arbitrary
 *     numbers of children
 *   - Framer respects reduced-motion automatically
 *
 * Bundle cost: Framer Motion + React. Acceptable because this island is the
 * only one on the landing page and only mounts on `client:visible`, so it
 * doesn't block first paint.
 */
import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import '../../styles/tailwind.css';

export interface ScrollRevealProps {
  children: ReactNode;
  /** Stagger direct children by this delay (s). 0 = no stagger. */
  stagger?: number;
  /** Initial delay before this section starts animating (s). */
  delay?: number;
  /** Y offset to animate up from (px). */
  offset?: number;
  /** Duration of the fade-up (s). */
  duration?: number;
  /** Wrapper element. Default <div>. Use 'section' if replacing a <section>. */
  as?: 'div' | 'section';
  className?: string;
}

const containerVariants: Variants = {
  hidden: {},
  visible: (custom: { stagger: number; delay: number }) => ({
    transition: {
      staggerChildren: custom.stagger,
      delayChildren: custom.delay,
    },
  }),
};

const itemVariants = (offset: number, duration: number): Variants => ({
  hidden: { opacity: 0, y: offset },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration,
      ease: [0.22, 1, 0.36, 1], // gentle ease-out — settles, doesn't bounce
    },
  },
});

export default function ScrollReveal({
  children,
  stagger = 0,
  delay = 0,
  offset = 14,
  duration = 0.7,
  as = 'div',
  className,
}: ScrollRevealProps) {
  const Wrapper = as === 'section' ? motion.section : motion.div;

  // If no stagger requested, treat the whole block as a single fade-up.
  if (stagger === 0) {
    return (
      <Wrapper
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        variants={itemVariants(offset, duration)}
        transition={{ delay }}
        className={className}
      >
        {children}
      </Wrapper>
    );
  }

  // Staggered children: every direct child fades up one after another.
  return (
    <Wrapper
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={containerVariants}
      custom={{ stagger, delay }}
      className={className}
    >
      {wrapChildren(children, offset, duration)}
    </Wrapper>
  );
}

function wrapChildren(children: ReactNode, offset: number, duration: number): ReactNode {
  // Wrap each direct child in a motion.div so the stagger variant applies.
  // Using React.Children.map would require importing React; we lean on the
  // fact that `children` is iterable when it's an array, and a single child
  // gets wrapped on its own.
  const variants = itemVariants(offset, duration);
  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <motion.div key={i} variants={variants}>
        {child}
      </motion.div>
    ));
  }
  return <motion.div variants={variants}>{children}</motion.div>;
}
