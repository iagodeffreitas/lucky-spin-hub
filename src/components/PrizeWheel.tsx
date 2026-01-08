import { useState, useRef, useEffect } from "react";

export interface Prize {
  id: string;
  name: string;
  color: string;
  is_losing: boolean;
  probability_weight?: number;
}

interface PrizeWheelProps {
  prizes: Prize[];
  onSpinEnd: (prize: Prize) => void;
  disabled?: boolean;
  spinsRemaining: number;
}

export function PrizeWheel({ prizes, onSpinEnd, disabled = false, spinsRemaining }: PrizeWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segmentAngle = 360 / prizes.length;

  const spinWheel = () => {
    if (isSpinning || disabled || spinsRemaining <= 0) return;

    setIsSpinning(true);

    // Select prize based on probability weights
    const totalWeight = prizes.reduce((sum, prize) => sum + (prize.probability_weight || 1), 0);
    const random = Math.random() * totalWeight;
    let weightSum = 0;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      weightSum += prize.probability_weight || 1;
      if (random <= weightSum) {
        selectedPrize = prize;
        break;
      }
    }

    const prizeIndex = prizes.findIndex((p) => p.id === selectedPrize.id);

    // Calculate rotation: multiple full spins + position to land on selected prize
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const prizeAngle = prizeIndex * segmentAngle;
    // Add offset to land in the center of the segment
    const offset = segmentAngle / 2;
    // The wheel rotates clockwise, so we need to calculate from the top (pointer position)
    const targetRotation = fullSpins * 360 + (360 - prizeAngle) - offset + Math.random() * (segmentAngle * 0.5);
    
    setRotation((prev) => prev + targetRotation);

    // After animation completes
    setTimeout(() => {
      setIsSpinning(false);
      onSpinEnd(selectedPrize);
    }, 5000);
  };

  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Pointer */}
      <div className="absolute -top-2 z-20">
        <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
      </div>

      {/* Wheel Container */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-110" />
        
        {/* Outer ring */}
        <div className="absolute inset-[-8px] rounded-full border-4 border-primary/50 shadow-glow" />

        {/* Wheel */}
        <div
          ref={wheelRef}
          className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] lg:w-[400px] lg:h-[400px] rounded-full overflow-hidden shadow-2xl transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? "5s" : "0s",
            transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.12, 0.99)",
          }}
        >
          {/* Segments */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {prizes.map((prize, index) => {
              const startAngle = index * segmentAngle;
              const endAngle = (index + 1) * segmentAngle;
              
              // Calculate path for each segment
              const startRad = (startAngle - 90) * (Math.PI / 180);
              const endRad = (endAngle - 90) * (Math.PI / 180);
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              const largeArcFlag = segmentAngle > 180 ? 1 : 0;
              
              const pathD = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
              
              // Text position (in the middle of the segment)
              const textAngle = startAngle + segmentAngle / 2;
              const textRad = (textAngle - 90) * (Math.PI / 180);
              const textX = 50 + 32 * Math.cos(textRad);
              const textY = 50 + 32 * Math.sin(textRad);

              return (
                <g key={prize.id}>
                  <path
                    d={pathD}
                    fill={prize.color}
                    stroke="hsl(220 40% 8%)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill={prize.is_losing ? "#ffffff" : "#0a0e17"}
                    fontSize={prizes.length > 8 ? "2.8" : "3.2"}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                    className="font-sans"
                  >
                    {prize.name.length > (prizes.length > 8 ? 8 : 10) 
                      ? prize.name.substring(0, prizes.length > 8 ? 6 : 8) + "..." 
                      : prize.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Center circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg border-2 md:border-4 border-primary-foreground flex items-center justify-center">
              <span className="text-lg md:text-xl lg:text-2xl font-display font-bold text-primary-foreground">CP</span>
            </div>
          </div>
        </div>

        {/* Decorative lights around the wheel */}
        <div className="absolute inset-[-16px] pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const rad = (angle - 90) * (Math.PI / 180);
            const x = 50 + 48 * Math.cos(rad);
            const y = 50 + 48 * Math.sin(rad);
            return (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary animate-pulse"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Spin Button */}
      <button
        onClick={spinWheel}
        disabled={isSpinning || disabled || spinsRemaining <= 0}
        className={`
          relative px-8 py-3 md:px-12 md:py-4 rounded-full font-display font-bold text-base md:text-lg uppercase tracking-wider
          transition-all duration-300 transform
          ${isSpinning || disabled || spinsRemaining <= 0
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-gold-lg active:scale-95"
          }
        `}
      >
        {isSpinning ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Girando...
          </span>
        ) : spinsRemaining <= 0 ? (
          "Sem giros restantes"
        ) : (
          <>Girar Roleta</>
        )}
        
        {!isSpinning && spinsRemaining > 0 && (
          <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs md:text-sm font-bold shadow-lg">
            {spinsRemaining}
          </span>
        )}
      </button>
    </div>
  );
}
