/**
 * Asset Organization - Logo & Media Slots
 */

export interface AssetCollection {
  logo: any;
  skyline: any;
  googleIcon: any;
  tamilNaduBanner: any;
  rameshAvatar: any;
  empoweringBanner: any;
  placeholderShopPhoto: any;
  [key: string]: any;
}

export const ASSETS: AssetCollection = {
  logo: require('./fic_logo.png'),
  skyline: require('./city_skyline.png'),
  googleIcon: require('./google_icon.png'),
  tamilNaduBanner: require('./tamil_nadu_banner.jpg'),
  rameshAvatar: require('./ramesh_avatar.jpg'),
  empoweringBanner: require('./empowering_banner.jpg'),
  placeholderShopPhoto: null as any,
};

export const rameshAvatar = ASSETS.rameshAvatar;
export const tamilNaduBanner = ASSETS.tamilNaduBanner;
export const empoweringBanner = ASSETS.empoweringBanner;
export const logo = ASSETS.logo;
export const skyline = ASSETS.skyline;
export const googleIcon = ASSETS.googleIcon;


