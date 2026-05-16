import Image from 'next/image';

const ASPECT = 3850 / 1134;

export function Brand({ variant = 'dark', size = 28 }: { variant?: 'light' | 'dark'; size?: number }) {
  const src = variant === 'light' ? '/logo-light.svg' : '/logo-dark.svg';
  const width = Math.round(size * ASPECT);
  return (
    <Image
      src={src}
      alt="Straighten Up"
      width={width}
      height={size}
      style={{ height: `${size}px`, width: `${width}px` }}
      priority
    />
  );
}
