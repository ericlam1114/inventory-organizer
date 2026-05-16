import Image from 'next/image';

export function Brand({ variant = 'dark', size = 28 }: { variant?: 'light' | 'dark'; size?: number }) {
  const src = variant === 'light' ? '/logo-light.svg' : '/logo-dark.svg';
  return (
    <Image
      src={src}
      alt="Straighten Up"
      width={size * (3850 / 1134)}
      height={size}
      priority
    />
  );
}
