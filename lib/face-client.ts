import type * as FaceApi from "@vladmandic/face-api";
import { averageDescriptors as averageStrict } from "@/lib/validation/biometric";

export { euclideanDistance } from "@/lib/validation/biometric";

type FaceApiModule = typeof FaceApi;

const MODEL_URL = "/models";
const MAX_PHOTO_EDGE = 1600;

let faceapiPromise: Promise<FaceApiModule> | null = null;

export function loadFaceApi(): Promise<FaceApiModule> {
  if (!faceapiPromise) {
    faceapiPromise = import("@vladmandic/face-api").then(async (faceapi) => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    });
    faceapiPromise.catch(() => {
      faceapiPromise = null;
    });
  }
  return faceapiPromise;
}

export async function detectDescriptors(
  source: ImageBitmap | HTMLVideoElement
): Promise<number[][]> {
  const faceapi = await loadFaceApi();
  const input: HTMLVideoElement | HTMLCanvasElement =
    source instanceof HTMLVideoElement ? source : bitmapToCanvas(source);
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.5,
  });
  const results = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks()
    .withFaceDescriptors();
  return results.map((r) => Array.from(r.descriptor));
}

function bitmapToCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process photos.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function averageDescriptors(list: number[][]): number[] {
  return list.length === 0 ? [] : averageStrict(list);
}
