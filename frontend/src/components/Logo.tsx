import React from 'react';
import logo from '@/assets/51talk-logo.jpg';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <img 
        src={logo} 
        alt="51Talk" 
        className={`${sizes[size]} w-auto object-contain`}
      />
      <span className="text-base font-semibold text-muted-foreground">
        51Talk S9 AI教练质检平台
      </span>
    </div>
  );
};
