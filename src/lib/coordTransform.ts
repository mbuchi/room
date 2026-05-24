export function wgs84ToLv95(lng: number, lat: number): [number, number] {
  const phiSec = lat * 3600;
  const lambdaSec = lng * 3600;

  const phiPrime = (phiSec - 169028.66) / 10000;
  const lambdaPrime = (lambdaSec - 26782.5) / 10000;

  const E =
    2600072.37 +
    211455.93 * lambdaPrime -
    10938.51 * lambdaPrime * phiPrime -
    0.36 * lambdaPrime * phiPrime * phiPrime -
    44.54 * lambdaPrime * lambdaPrime * lambdaPrime;

  const N =
    1200147.07 +
    308807.95 * phiPrime +
    3745.25 * lambdaPrime * lambdaPrime +
    76.63 * phiPrime * phiPrime -
    194.56 * lambdaPrime * lambdaPrime * phiPrime +
    119.79 * phiPrime * phiPrime * phiPrime;

  return [Math.round(E * 100) / 100, Math.round(N * 100) / 100];
}
