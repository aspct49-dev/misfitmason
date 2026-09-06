'use client';

import { useEffect, useRef, useState } from 'react';

/** Fades a section up 24px the first time it enters view. Nothing more. */
export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setShown(true);
      io.disconnect();
      window.removeEventListener('scroll', check);
    };

    /**
     * IntersectionObserver alone is not enough. It only fires when the
     * intersection ratio *crosses* a threshold, so an element that goes from
     * below the viewport straight to above it — an instant scrollTo, an anchor
     * jump, a restored scroll position on reload — never intersects, never
     * fires, and stays at opacity 0 for the rest of the session.
     *
     * This check covers that: anything at or above the fold is revealed
     * regardless of whether it was ever seen crossing.
     */
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) reveal();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { rootMargin: '-40px' },
    );
    io.observe(el);

    check();
    window.addEventListener('scroll', check, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', check);
    };
  }, []);

  return (
    <div ref={ref} className="reveal" data-shown={shown} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
