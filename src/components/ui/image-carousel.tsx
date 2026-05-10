'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const go = (dir: number) => {
    setIndex((prev) => (prev + dir + images.length) % images.length);
  };

  return (
    <div className="relative">
      <div className="flex justify-center bg-black">
        <img
          key={images[index]}
          src={images[index]}
          alt={`图片 ${index + 1}`}
          className="max-h-[28rem] w-auto object-contain"
          loading="lazy"
        />
      </div>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={() => go(-1)}
            aria-label="上一张"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={() => go(1)}
            aria-label="下一张"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-2 bg-white/50'}`}
                onClick={() => setIndex(i)}
                aria-label={`跳转到图片 ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
