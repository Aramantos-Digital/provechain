"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface ScrollIconProps {
  target: React.RefObject<HTMLElement | null> | "page";
  color: string;
}

function ScrollIcon({ target, color }: ScrollIconProps) {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [topOffset, setTopOffset] = useState(72); // 4.5rem default (navbar h-16 + 0.5rem gap)

  const isPage = target === "page";

  const measureTop = useCallback(() => {
    if (!isPage) return;
    const header = document.querySelector("header");
    if (!header) return;
    let bottom = header.offsetHeight; // 64px
    const banner = document.querySelector("[data-early-access-banner]") as HTMLElement | null;
    if (banner && banner.offsetHeight > 0) {
      bottom += banner.offsetHeight;
    }
    setTopOffset(bottom + 8);
  }, [isPage]);

  const checkScroll = useCallback(() => {
    const threshold = 10;
    let scrollTop: number, scrollLeft: number;
    let scrollHeight: number, scrollWidth: number;
    let clientHeight: number, clientWidth: number;

    if (isPage) {
      scrollTop = window.scrollY;
      scrollLeft = window.scrollX;
      scrollHeight = document.documentElement.scrollHeight;
      scrollWidth = document.documentElement.scrollWidth;
      clientHeight = window.innerHeight;
      clientWidth = window.innerWidth;
    } else {
      const el = (target as React.RefObject<HTMLElement>).current;
      if (!el) return;
      scrollTop = el.scrollTop;
      scrollLeft = el.scrollLeft;
      scrollHeight = el.scrollHeight;
      scrollWidth = el.scrollWidth;
      clientHeight = el.clientHeight;
      clientWidth = el.clientWidth;
    }

    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - threshold);
    // Never show horizontal arrows for page-level scroll (horizontal overflow is a layout bug)
    setCanScrollLeft(isPage ? false : scrollLeft > threshold);
    setCanScrollRight(isPage ? false : scrollLeft + clientWidth < scrollWidth - threshold);
  }, [isPage, target]);

  useEffect(() => {
    measureTop();
    checkScroll();

    if (isPage) {
      window.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      window.addEventListener("resize", measureTop);
      // Re-check top offset periodically for banner dismiss
      const interval = setInterval(measureTop, 1000);
      return () => {
        window.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
        window.removeEventListener("resize", measureTop);
        clearInterval(interval);
      };
    }

    const el = (target as React.RefObject<HTMLElement>).current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [isPage, target, checkScroll, measureTop]);

  const hasVertical = canScrollUp || canScrollDown;
  const hasHorizontal = canScrollLeft || canScrollRight;

  if (!hasVertical && !hasHorizontal) return null;

  const upChevron = (
    <svg
      width="20" height="11" viewBox="0 0 16 10" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-opacity duration-300 ${canScrollUp ? "opacity-100" : "opacity-0"}`}
    >
      <polyline points="5,7 8,4 11,7" />
    </svg>
  );

  const downChevron = (
    <svg
      width="20" height="11" viewBox="0 0 16 10" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-opacity duration-300 ${canScrollDown ? "opacity-100" : "opacity-0"}`}
    >
      <polyline points="5,3 8,6 11,3" />
    </svg>
  );

  const leftChevron = (
    <svg
      width="11" height="18" viewBox="0 0 10 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-opacity duration-300 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
    >
      <polyline points="7,5 4,8 7,11" />
    </svg>
  );

  const rightChevron = (
    <svg
      width="11" height="18" viewBox="0 0 10 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
    >
      <polyline points="3,5 6,8 3,11" />
    </svg>
  );

  const mouseIcon = (
    <svg
      width="20" height="18" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <rect x="4" y="1" width="8" height="14" rx="4" />
      <line x1="8" y1="4" x2="8" y2="7" />
    </svg>
  );

  const icon = (
    <div
      className="cursor-default flex flex-col items-center rounded-full"
      style={{ color, background: "#27292b87" }}
    >
      {hasVertical && upChevron}
      <div className="flex items-center">
        {hasHorizontal && leftChevron}
        {mouseIcon}
        {hasHorizontal && rightChevron}
      </div>
      {hasVertical && downChevron}
    </div>
  );

  if (isPage) {
    return (
      <div className="fixed right-2 z-50 max-w-[calc(100vw-1rem)]" style={{ top: topOffset }}>
        {icon}
      </div>
    );
  }

  return (
    <div className="absolute top-2 right-2 z-10">
      {icon}
    </div>
  );
}

/* Container mode */

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export function ScrollContainer({ children, className = "", color = "#38bdf8" }: ContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div className="relative overflow-hidden max-w-full">
      <ScrollIcon target={scrollRef} color={color} />
      <div className={`overflow-auto max-w-full ${className}`} ref={scrollRef}>
        {children}
      </div>
    </div>
  );
}

/* Page mode */

interface PageProps {
  color?: string;
}

export function PageScrollIndicator({ color = "#38bdf8" }: PageProps) {
  return <ScrollIcon target="page" color={color} />;
}

export default function ScrollIndicator({ children, className = "", color = "#38bdf8" }: ContainerProps) {
  return <ScrollContainer className={className} color={color}>{children}</ScrollContainer>;
}
