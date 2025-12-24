import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BlurTextProps {
  text: string;
  delay?: number;
  animateBy?: 'words' | 'characters';
  direction?: 'top' | 'bottom' | 'left' | 'right';
  onAnimationComplete?: () => void;
  className?: string;
}

const BlurText: React.FC<BlurTextProps> = ({
  text,
  delay = 150,
  animateBy = 'words',
  direction = 'top',
  onAnimationComplete,
  className,
}) => {
  const [animatedItems, setAnimatedItems] = useState<boolean[]>([]);
  
  const items = animateBy === 'words' ? text.split(' ') : text.split('');
  
  const getDirectionStyles = (isAnimated: boolean) => {
    const baseStyles = {
      opacity: isAnimated ? 1 : 0,
      filter: isAnimated ? 'blur(0px)' : 'blur(8px)',
      transform: 'translate(0, 0)',
    };
    
    if (!isAnimated) {
      switch (direction) {
        case 'top':
          baseStyles.transform = 'translateY(-20px)';
          break;
        case 'bottom':
          baseStyles.transform = 'translateY(20px)';
          break;
        case 'left':
          baseStyles.transform = 'translateX(-20px)';
          break;
        case 'right':
          baseStyles.transform = 'translateX(20px)';
          break;
      }
    }
    
    return baseStyles;
  };

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    items.forEach((_, index) => {
      const timeout = setTimeout(() => {
        setAnimatedItems(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
        
        if (index === items.length - 1 && onAnimationComplete) {
          setTimeout(onAnimationComplete, 300);
        }
      }, index * delay);
      
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [items.length, delay, onAnimationComplete]);

  return (
    <span className={cn('inline-flex flex-wrap gap-x-2', className)}>
      {items.map((item, index) => (
        <span
          key={index}
          className="inline-block transition-all duration-500 ease-out"
          style={getDirectionStyles(animatedItems[index])}
        >
          {item}
          {animateBy === 'words' && index < items.length - 1 ? '' : ''}
        </span>
      ))}
    </span>
  );
};

export default BlurText;
