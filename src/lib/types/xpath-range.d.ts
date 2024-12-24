declare module "xpath-range" {
  export const fromRange: any;
}

declare module "node-lcs" {
  export interface LCSResult {
    length: number;
    sequence: string;
    offset: number;
  }
  function lcs(str1: string, str2: string): LCSResult;
  export = lcs;
}
