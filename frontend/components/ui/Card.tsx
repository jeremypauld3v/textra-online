import React from 'react';
import { ViewProps } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  variant?: 'default' | 'flat';
  padding?: 'default' | 'none';
}

const Card = ({ 
  children, 
  delay = 0, 
  variant = 'default', 
  padding = 'default',
  className = "",
  style,
  ...props 
}: CardProps) => {
  const baseClass = "relative overflow-hidden border border-white/5";
  const variantClasses = {
    default: "bg-slate-900/60 rounded-[32px]",
    flat: "bg-slate-900/40 rounded-2xl",
  };
  const paddingClasses = {
    default: "p-6",
    none: "p-0",
  };

  return (
    <Animated.View 
      entering={FadeIn.delay(delay).duration(300)}
      className={`${baseClass} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

export default Card;
