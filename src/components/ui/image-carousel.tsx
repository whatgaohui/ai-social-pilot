'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
}

/**
 * Image carousel component for displaying multiple images with navigation
 * @param images - Array of image URLs
 */
export function ImageCarousel({ images }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);

  const go = (dir: number) => {
    setIndex((prev) => (prev + dir + images.length) % images.length);
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex justify-center">
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
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
            onClick={() => go(-1)}
            aria-label="上一张"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
            onClick={() => go(1)}
            aria-label="下一张"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === index ? 'bg-white w-4' : 'bg-white/50'
                }`}
                onClick={() => setIndex(i)}
                aria-label={`跳转到图片 ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}