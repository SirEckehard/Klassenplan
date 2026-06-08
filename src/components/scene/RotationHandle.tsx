import React from 'react';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';

interface RotationHandleProps {
  width: number;
  height: number;
  inverseRotation: number;
  onRotateStart: (event: React.PointerEvent<SVGGElement>) => void;
}

function RotationHandle({
  width,
  height,
  inverseRotation,
  onRotateStart,
}: RotationHandleProps) {
  return (
    <g
      transform={`translate(${width - 5} ${height - 5}) rotate(${inverseRotation})`}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onRotateStart(e);
      }}
      style={{ cursor: 'grab' }}
      aria-label="rotate table"
      role="button"
    >
      <circle r={10} fill="#3b82f6" />
      <g transform="translate(-6 -6)">
        <ArrowClockwiseIcon size={12} color="#fff" />
      </g>
    </g>
  );
}

export default React.memo(RotationHandle);
