// Per-project settings shared by every style: brand name/logo and the pixel size of the source screenshots.
import React from 'react';
export type Brand = {name: string; logo: string; shotW: number; shotH: number};
export const BrandCtx = React.createContext<Brand>({name: 'Brand', logo: 'logo.png', shotW: 2880, shotH: 1620});
export const useBrand = () => React.useContext(BrandCtx);
export type FilmData = {
  brand?: {name: string; logo?: string};
  shot?: {w: number; h: number};
  music?: string;
  slides: any[];
};
export const brandOf = (d: FilmData): Brand => ({
  name: d.brand?.name || 'Brand', logo: d.brand?.logo || 'logo.png', shotW: d.shot?.w || 2880, shotH: d.shot?.h || 1620,
});
