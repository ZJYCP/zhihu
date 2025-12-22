declare module 'jschardet' {
  export interface IDetectedMap {
    encoding: string;
    confidence: number;
  }

  export function detect(buffer: Buffer | string): IDetectedMap;
  export function detectAll(buffer: Buffer | string): IDetectedMap[];
}
