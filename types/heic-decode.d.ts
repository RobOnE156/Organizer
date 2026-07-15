declare module "heic-decode" {
  interface DecodedImage {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }
  interface DecodeOptions {
    buffer: ArrayBuffer | Uint8Array | Buffer;
  }
  function decode(options: DecodeOptions): Promise<DecodedImage>;
  export = decode;
}
