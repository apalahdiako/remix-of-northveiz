import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Product360ViewerProps {
  images: string[];
  productName: string;
  onError?: () => void;
}

export const Product360Viewer = ({ images, productName, onError }: Product360ViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, index: 0 });
  const velocityRef = useRef(0);
  const lastPosRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const autoRotateRef = useRef<number>();

  const totalImages = images.length;
  const sensitivity = 0.5; // Adjust rotation sensitivity

  // Preload images
  useEffect(() => {
    const preloadPromises = images.map((src, index) => {
      return new Promise<number>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(index);
        img.onerror = reject;
        img.src = src;
      });
    });

    Promise.all(preloadPromises)
      .then((indices) => {
        setLoadedImages(new Set(indices));
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading images:', error);
        setIsLoading(false);
        onError?.();
      });
  }, [images, onError]);

  // Inertia animation
  const applyInertia = useCallback(() => {
    if (Math.abs(velocityRef.current) < 0.1) {
      velocityRef.current = 0;
      return;
    }

    velocityRef.current *= 0.95; // Friction
    const newIndex = Math.round(currentIndex + velocityRef.current) % totalImages;
    setCurrentIndex(newIndex < 0 ? totalImages + newIndex : newIndex);

    animationFrameRef.current = requestAnimationFrame(applyInertia);
  }, [currentIndex, totalImages]);

  // Auto-rotate
  useEffect(() => {
    if (isAutoRotating && !isDragging) {
      autoRotateRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalImages);
      }, 100);
    } else {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    }

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [isAutoRotating, isDragging, totalImages]);

  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    startPosRef.current = { x: clientX, index: currentIndex };
    lastPosRef.current = clientX;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [currentIndex]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;

    const deltaX = clientX - startPosRef.current.x;
    const containerWidth = containerRef.current?.offsetWidth || 1;
    const imagesToMove = (deltaX / containerWidth) * totalImages * sensitivity;
    
    const newIndex = Math.round(startPosRef.current.index - imagesToMove) % totalImages;
    setCurrentIndex(newIndex < 0 ? totalImages + newIndex : newIndex);

    // Calculate velocity
    const now = Date.now();
    const timeDelta = now - lastTimeRef.current;
    if (timeDelta > 0) {
      velocityRef.current = (clientX - lastPosRef.current) / timeDelta * -sensitivity;
    }
    lastPosRef.current = clientX;
    lastTimeRef.current = now;
  }, [isDragging, totalImages, sensitivity]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    
    // Apply inertia if there's velocity
    if (Math.abs(velocityRef.current) > 0.1) {
      animationFrameRef.current = requestAnimationFrame(applyInertia);
    }
  }, [applyInertia]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const toggleAutoRotate = () => {
    setIsAutoRotating(!isAutoRotating);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="aspect-square w-full bg-muted relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        )}
        
        <img
          src={images[currentIndex]}
          alt={`${productName} - 360° view ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-150"
          style={{ opacity: loadedImages.has(currentIndex) ? 1 : 0 }}
          draggable={false}
        />

        {/* 360° Badge */}
        <Badge className="absolute top-4 left-4 bg-background/80 text-foreground backdrop-blur-sm">
          <RotateCw className="w-3 h-3 mr-1" />
          360°
        </Badge>

        {/* Auto-rotate button */}
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={toggleAutoRotate}
        >
          <RotateCw className={`w-4 h-4 ${isAutoRotating ? 'animate-spin' : ''}`} />
        </Button>

        {/* Instruction hint */}
        {!isDragging && !isAutoRotating && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-foreground animate-fade-in">
            Geser untuk memutar
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-150"
              style={{ width: `${((currentIndex + 1) / totalImages) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {currentIndex + 1}/{totalImages}
          </span>
        </div>
      </div>
    </div>
  );
};
