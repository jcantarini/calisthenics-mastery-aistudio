import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * StaggerList — animates its children in with a subtle stagger.
 * Use as a drop-in wrapper around <ul>/<div>. Respects reduced motion.
 */
export function StaggerList({
  children,
  className,
  as = "ul",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: "ul" | "div" | "ol";
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: reduce ? {} : { staggerChildren: 0.05, delayChildren: delay },
        },
      }}
    >
      {children}
    </Comp>
  );
}

/** Item wrapper for StaggerList children. */
export const StaggerItem = forwardRef<HTMLLIElement, HTMLMotionProps<"li"> & { as?: "li" | "div" }>(
  ({ className, children, as = "li", ...rest }, ref) => {
    const reduce = useReducedMotion();
    const Comp = motion[as] as typeof motion.li;
    return (
      <Comp
        ref={ref as never}
        variants={{
          hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
          show: reduce
            ? { opacity: 1, transition: { duration: 0.15 } }
            : {
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 380, damping: 32 },
              },
        }}
        className={className}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
StaggerItem.displayName = "StaggerItem";

/** Section that fades + slides in once on mount. */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 8,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * PressableCard — link/card wrapper with tactile press + hover on desktop.
 * Ensures min tap target and consistent focus ring.
 */
export const PressableCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, children, ...rest }, ref) => {
    const reduce = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        whileHover={reduce ? undefined : { y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={cn("min-h-11", className)}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
PressableCard.displayName = "PressableCard";
