'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

interface CrowdCanvasProps {
  src: string;
  rows?: number;
  cols?: number;
  className?: string;
}

interface StageSize {
  width: number;
  height: number;
}

interface Peep {
  image: HTMLImageElement;
  rect: [number, number, number, number];
  width: number;
  height: number;
  x: number;
  y: number;
  anchorY: number;
  scaleX: number;
  walk: gsap.core.Timeline | null;
  setRect: (rect: [number, number, number, number]) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

interface ResetProps {
  startX: number;
  startY: number;
  endX: number;
}

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

const randomIndex = <T,>(array: T[]): number => randomRange(0, array.length) | 0;

const removeFromArray = <T,>(array: T[], index: number): T | undefined => {
  if (index < 0 || index >= array.length) return undefined;
  const [item] = array.splice(index, 1);
  return item;
};

const removeItemFromArray = <T,>(array: T[], item: T): T | undefined =>
  removeFromArray(array, array.indexOf(item));

const removeRandomFromArray = <T,>(array: T[]): T | undefined =>
  removeFromArray(array, randomIndex(array));

const createPeep = ({
  image,
  rect,
}: {
  image: HTMLImageElement;
  rect: [number, number, number, number];
}): Peep => {
  const peep: Peep = {
    image,
    rect,
    width: rect[2],
    height: rect[3],
    x: 0,
    y: 0,
    anchorY: 0,
    scaleX: 1,
    walk: null,
    setRect: (nextRect) => {
      peep.rect = nextRect;
      peep.width = nextRect[2];
      peep.height = nextRect[3];
    },
    render: (ctx) => {
      ctx.save();
      ctx.translate(peep.x, peep.y);
      ctx.scale(peep.scaleX, 1);
      ctx.drawImage(
        peep.image,
        peep.rect[0],
        peep.rect[1],
        peep.rect[2],
        peep.rect[3],
        0,
        0,
        peep.width,
        peep.height
      );
      ctx.restore();
    },
  };

  return peep;
};

const resetPeep = ({ stage, peep }: { stage: StageSize; peep: Peep }): ResetProps => {
  const direction = Math.random() > 0.5 ? 1 : -1;
  const offsetY = 100 - 250 * gsap.parseEase('power2.in')(Math.random());
  const startY = stage.height - peep.height + offsetY;
  let startX = -peep.width;
  let endX = stage.width;

  if (direction === 1) {
    peep.scaleX = 1;
  } else {
    startX = stage.width + peep.width;
    endX = 0;
    peep.scaleX = -1;
  }

  peep.x = startX;
  peep.y = startY;
  peep.anchorY = startY;

  return { startX, startY, endX };
};

const normalWalk = ({ peep, props }: { peep: Peep; props: ResetProps }): gsap.core.Timeline => {
  const { startX, startY, endX } = props;
  const xDuration = 10;
  const yDuration = 0.25;

  peep.x = startX;
  peep.y = startY;

  const timeline = gsap.timeline();
  timeline.timeScale(randomRange(0.5, 1.5));

  timeline.to(
    peep,
    {
      duration: xDuration,
      x: endX,
      ease: 'none',
    },
    0
  );

  timeline.to(
    peep,
    {
      duration: yDuration,
      repeat: xDuration / yDuration,
      yoyo: true,
      y: startY - 10,
    },
    0
  );

  return timeline;
};

export function CrowdCanvas({
  src,
  rows = 15,
  cols = 7,
  className = 'absolute inset-0 h-full w-full',
}: CrowdCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stage: StageSize = {
      width: 0,
      height: 0,
    };

    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const createPeeps = (image: HTMLImageElement) => {
      const { naturalWidth: width, naturalHeight: height } = image;
      const rectWidth = width / rows;
      const rectHeight = height / cols;
      const total = rows * cols;

      for (let i = 0; i < total; i += 1) {
        const rect: [number, number, number, number] = [
          (i % rows) * rectWidth,
          ((i / rows) | 0) * rectHeight,
          rectWidth,
          rectHeight,
        ];
        allPeeps.push(createPeep({ image, rect }));
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      if (!peep) return;

      const walk = normalWalk({
        peep,
        props: resetPeep({
          peep,
          stage,
        }),
      }).eventCallback('onComplete', () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });

      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        const peep = addPeepToCrowd();
        peep?.walk?.progress(Math.random());
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      crowd.forEach((peep) => peep.render(ctx));
      ctx.restore();
    };

    const resize = () => {
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      canvas.width = stage.width * window.devicePixelRatio;
      canvas.height = stage.height * window.devicePixelRatio;

      crowd.forEach((peep) => peep.walk?.kill());

      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    const image = document.createElement('img');

    const init = () => {
      createPeeps(image);
      availablePeeps.push(...allPeeps);
      resize();
      gsap.ticker.add(render);
    };

    const handleResize = () => resize();

    image.onload = init;
    image.src = src;
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gsap.ticker.remove(render);
      crowd.forEach((peep) => peep.walk?.kill());
    };
  }, [src, rows, cols]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
