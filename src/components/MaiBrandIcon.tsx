import React from 'react';

interface MaiBrandIconProps {
  className?: string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  invert?: boolean;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 20,
  sm: 26,
  md: 32,
  lg: 48,
  xl: 64
};

export const MaiBrandIcon: React.FC<MaiBrandIconProps> = ({
  className = '',
  size = 'md',
  invert = false
}) => {
  const px = typeof size === 'number' ? size : SIZE_MAP[size] || 32;
  const bg = invert ? '#FFFFFF' : '#080809';
  const fg = invert ? '#080809' : '#FFFFFF';
  const border = invert ? '#080809' : '#FFFFFF';

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${className}`}
      aria-label="MAI"
    >
      {/* Outer Rounded Monochrome Frame */}
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx="28"
        fill={bg}
        stroke={border}
        strokeWidth="6"
      />
      {/* Crisp Geometric "MAI" Typography */}
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fill={fg}
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="41"
        letterSpacing="-1.5"
      >
        MAI
      </text>
      {/* Minimalist Architectural Accent Bar */}
      <rect
        x="34"
        y="82"
        width="52"
        height="5"
        rx="2.5"
        fill={fg}
      />
    </svg>
  );
};
