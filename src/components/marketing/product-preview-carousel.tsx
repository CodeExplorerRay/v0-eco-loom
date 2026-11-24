"use client";

import Image from 'next/image';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Maximize2, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const screenshots = [
  {
    title: 'Carbon dashboard',
    caption: 'Facility scope, emissions, goals, and activity in one view.',
    src: '/eco-loom-dashboard-hero.png',
    alt: 'Eco-Loom dashboard showing facility scope, carbon metrics, emissions by scope, facility comparison, and reporting activity.',
    width: 2560,
    height: 5208,
    fit: 'cover',
  },
  {
    title: 'Emissions by category',
    caption: 'Inspect Scope 1, 2, and 3 totals and verification status.',
    src: '/eco-loom-emissions-detail.png',
    alt: 'Emissions by Category Details showing Scope 1, 2, and 3 totals, verification status, pending review, and ledger rows.',
    width: 1286,
    height: 725,
    fit: 'contain',
  },
  {
    title: 'Data ingest',
    caption: 'Upload evidence, enter activity, or import a CSV.',
    src: '/eco-loom-data-ingest.png',
    alt: 'Eco-Loom Data Ingest page showing evidence upload, manual entry, CSV import, and recent ingest activity.',
    width: 2560,
    height: 2384,
    fit: 'contain',
  },
] as const;

const carouselOptions = { align: 'start' as const, loop: true };
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getMotionPreference() {
  return window.matchMedia(reducedMotionQuery).matches;
}

export function ProductScreenshotCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    () => true
  );
  const [userOptedIntoMotion, setUserOptedIntoMotion] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const setCarouselApi = useCallback((carouselApi: CarouselApi) => {
    setApi(carouselApi);
  }, []);

  const activeScreenshot = screenshots[activeIndex] ?? screenshots[0];
  const isAutoPlaying =
    isPlaying && (!prefersReducedMotion || userOptedIntoMotion) && !isExpanded;

  useEffect(() => {
    if (!api) return;

    const updateActiveIndex = () => setActiveIndex(api.selectedScrollSnap());
    updateActiveIndex();
    api.on('select', updateActiveIndex);

    return () => {
      api.off('select', updateActiveIndex);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !isAutoPlaying) return;

    const intervalId = window.setInterval(() => api.scrollNext(), 6500);
    return () => window.clearInterval(intervalId);
  }, [api, isAutoPlaying]);

  const togglePlayback = () => {
    if (isAutoPlaying) {
      setIsPlaying(false);
      return;
    }

    if (prefersReducedMotion) setUserOptedIntoMotion(true);
    setIsPlaying(true);
  };

  const showScreenshot = (index: number) => {
    api?.scrollTo(index);
    setIsPlaying(false);
  };

  const openScreenshot = () => {
    setIsPlaying(false);
    setZoomLevel(100);
    setIsExpanded(true);
  };

  return (
    <figure className="overflow-hidden rounded-[1.75rem] border border-emerald-200/80 bg-white shadow-[0_40px_120px_-50px_rgba(21,128,61,0.42)]">
      <div className="flex items-center justify-between gap-3 border-b border-green-100 px-4 py-3 text-sm font-medium text-gray-700 sm:px-5">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-green-500" />
          Eco-Loom product preview
        </span>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-800">
          {activeIndex + 1} / {screenshots.length}
        </span>
      </div>

      <Carousel
        aria-label="Eco-Loom product screenshots"
        className="group"
        onFocusCapture={() => setIsPlaying(false)}
        onMouseEnter={() => setIsPlaying(false)}
        opts={carouselOptions}
        setApi={setCarouselApi}
      >
        <CarouselContent className="ml-0">
          {screenshots.map((screenshot, index) => (
            <CarouselItem
              key={screenshot.src}
              aria-hidden={activeIndex !== index}
              aria-label={`${index + 1} of ${screenshots.length}: ${screenshot.title}`}
              className="pl-0"
            >
              <div className="relative aspect-[1.28] w-full overflow-hidden bg-emerald-50">
                <Image
                  alt={screenshot.alt}
                  className={
                    screenshot.fit === 'cover'
                      ? 'object-cover object-top'
                      : 'object-contain p-3 sm:p-5'
                  }
                  fill
                  priority={index === 0}
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  src={screenshot.src}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          aria-label="Previous screenshot"
          className="left-3 z-10 size-10 border-green-200 bg-white/95 text-green-900 shadow-lg hover:bg-white sm:left-4"
        />
        <CarouselNext
          aria-label="Next screenshot"
          className="right-3 z-10 size-10 border-green-200 bg-white/95 text-green-900 shadow-lg hover:bg-white sm:right-4"
        />
      </Carousel>

      <figcaption className="grid gap-4 px-4 py-4 sm:px-5">
        <div
          aria-atomic="true"
          aria-live={isAutoPlaying ? 'off' : 'polite'}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <p className="font-semibold text-gray-900">{activeScreenshot.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              {activeScreenshot.caption}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div aria-label="Choose product screenshot" className="flex items-center gap-2" role="group">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.src}
                aria-current={activeIndex === index ? 'true' : undefined}
                aria-label={`Show screenshot ${index + 1}: ${screenshot.title}`}
                className={`h-2.5 rounded-full transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  activeIndex === index ? 'w-8 bg-green-700' : 'w-2.5 bg-green-200 hover:bg-green-400'
                }`}
                onClick={() => showScreenshot(index)}
                type="button"
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button aria-label={isAutoPlaying ? 'Pause carousel' : 'Play carousel'} onClick={togglePlayback} size="sm" variant="outline">
              {isAutoPlaying ? <Pause aria-hidden="true" data-icon="inline-start" /> : <Play aria-hidden="true" data-icon="inline-start" />}
              {isAutoPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button onClick={openScreenshot} size="sm" variant="outline">
              <Maximize2 aria-hidden="true" data-icon="inline-start" />
              View full size
            </Button>
          </div>
        </div>
      </figcaption>

      <Dialog onOpenChange={setIsExpanded} open={isExpanded}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-4 overflow-hidden p-4 sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] sm:p-6 lg:max-w-6xl">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>{activeScreenshot.title}</DialogTitle>
            <DialogDescription>
              Full-size product screenshot. Scroll or zoom in to inspect interface details.
            </DialogDescription>
          </DialogHeader>
          <div aria-label="Screenshot zoom controls" className="flex items-center justify-end gap-2" role="group">
            <Button
              aria-label="Zoom out screenshot"
              disabled={zoomLevel <= 100}
              onClick={() => setZoomLevel((current) => Math.max(100, current - 50))}
              size="icon"
              variant="outline"
            >
              <ZoomOut aria-hidden="true" />
            </Button>
            <span aria-live="polite" className="min-w-12 text-center text-xs font-medium tabular-nums text-gray-600">
              {zoomLevel}%
            </span>
            <Button
              aria-label="Zoom in screenshot"
              disabled={zoomLevel >= 300}
              onClick={() => setZoomLevel((current) => Math.min(300, current + 50))}
              size="icon"
              variant="outline"
            >
              <ZoomIn aria-hidden="true" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-emerald-50/50 p-2 sm:p-4">
            <Image
              alt={activeScreenshot.alt}
              className="mx-auto h-auto max-w-none transition-[width] motion-reduce:transition-none"
              height={activeScreenshot.height}
              sizes="(max-width: 768px) 96vw, 1400px"
              src={activeScreenshot.src}
              style={{ width: `${zoomLevel}%` }}
              width={activeScreenshot.width}
            />
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}
