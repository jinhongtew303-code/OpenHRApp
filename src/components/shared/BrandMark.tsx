import React from 'react';
import { IS_CUSTOM_BRAND, brandInitials } from '../../config/brand';

interface Props {
  /** Classes for the <img> (original logo) or the text badge (custom brand). */
  className?: string;
  textClassName?: string;
}

/** The app logo: the OpenHRApp image, or a text badge for a custom brand. */
export const BrandMark: React.FC<Props> = ({ className = 'w-full h-full', textClassName = 'text-2xl' }) => {
  if (!IS_CUSTOM_BRAND) {
    return <img src="/img/logo.webp" className={`${className} object-contain`} alt="Logo" />;
  }
  return (
    <div className={`${className} rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 flex items-center justify-center`}>
      <span className={`font-black text-white tracking-tight ${textClassName}`}>{brandInitials()}</span>
    </div>
  );
};
