declare module "@vite-pwa/assets-generator/api" {
  export interface ImageAssetsInstructions {
    [key: string]: unknown;
  }

  export interface IconAsset<T = unknown> {
    path?: string;
    mimeType?: string;
    buffer?: Promise<Buffer>;
    age?: number;
    lastModified?: number;
    data?: T;
  }

  export interface FaviconLink {
    [key: string]: unknown;
  }

  export interface HtmlLink {
    [key: string]: unknown;
  }

  export interface AppleSplashScreenLink {
    [key: string]: unknown;
  }

  export interface HtmlLinkPreset {
    [key: string]: unknown;
  }
}

declare module "@vite-pwa/assets-generator/config" {
  export interface BuiltInPreset {
    [key: string]: unknown;
  }

  export interface Preset {
    [key: string]: unknown;
  }
}
