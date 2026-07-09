import React from 'react';
import { ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
  const baseClass = "relative overflow-hidden border border-white/[0.08]";
  const variantClasses = {
    default: "bg-white/[0.04] rounded-2xl",
    flat: "bg-white/[0.03] rounded-xl",
  };
  const paddingClasses = {
    default: "p-5",
    none: "p-0",
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(350).springify().damping(18)}
      className={`${baseClass} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

export default Card;
