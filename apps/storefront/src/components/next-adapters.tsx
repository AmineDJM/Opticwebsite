import Link from "next/link";
import Image from "next/image";
import type { ComponentProps } from "react";

/** Adapters so @optic/ui components (which take generic Link/Image) use Next's. */
export function LinkAdapter({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={className}>{children}</Link>;
}

export function ImageAdapter({ src, alt, className, fill, sizes }: { src: string; alt: string; className?: string; fill?: boolean; sizes?: string }) {
  const props: ComponentProps<typeof Image> = fill
    ? { src, alt, fill: true, sizes: sizes ?? "100vw", className }
    : { src, alt, width: 500, height: 500, className };
  return <Image {...props} unoptimized={src.endsWith(".svg")} />;
}
