'use client';

import { useEffect, useRef, useState } from 'react';

/** Fades a section up 24px the first time it enters view. Nothing more. */
export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '-40px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal" data-shown={shown} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
