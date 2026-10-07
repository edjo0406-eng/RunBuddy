import hero640Webp from "@/assets/images/optimized/hero-bg-640.webp";
import hero1024Webp from "@/assets/images/optimized/hero-bg-1024.webp";
import hero1408Webp from "@/assets/images/optimized/hero-bg-1408.webp";
import hero640Jpg from "@/assets/images/optimized/hero-bg-640.jpg";
import hero1024Jpg from "@/assets/images/optimized/hero-bg-1024.jpg";
import hero1408Jpg from "@/assets/images/optimized/hero-bg-1408.jpg";
import female320Webp from "@/assets/images/optimized/avatar-f-320.webp";
import female640Webp from "@/assets/images/optimized/avatar-f-640.webp";
import female960Webp from "@/assets/images/optimized/avatar-f-960.webp";
import female320Jpg from "@/assets/images/optimized/avatar-f-320.jpg";
import female640Jpg from "@/assets/images/optimized/avatar-f-640.jpg";
import female960Jpg from "@/assets/images/optimized/avatar-f-960.jpg";
import male320Webp from "@/assets/images/optimized/avatar-m-320.webp";
import male640Webp from "@/assets/images/optimized/avatar-m-640.webp";
import male960Webp from "@/assets/images/optimized/avatar-m-960.webp";
import male320Jpg from "@/assets/images/optimized/avatar-m-320.jpg";
import male640Jpg from "@/assets/images/optimized/avatar-m-640.jpg";
import male960Jpg from "@/assets/images/optimized/avatar-m-960.jpg";

function srcSet(urls: string[], widths: number[]) {
  return urls.map((url, index) => `${url} ${widths[index]}w`).join(", ");
}

export const heroImage = {
  src: hero1408Jpg,
  webp: srcSet([hero640Webp, hero1024Webp, hero1408Webp], [640, 1024, 1408]),
  jpeg: srcSet([hero640Jpg, hero1024Jpg, hero1408Jpg], [640, 1024, 1408]),
};

export const defaultRunnerImages = {
  female: {
    src: female640Jpg,
    webp: srcSet([female320Webp, female640Webp, female960Webp], [320, 640, 960]),
    jpeg: srcSet([female320Jpg, female640Jpg, female960Jpg], [320, 640, 960]),
  },
  male: {
    src: male640Jpg,
    webp: srcSet([male320Webp, male640Webp, male960Webp], [320, 640, 960]),
    jpeg: srcSet([male320Jpg, male640Jpg, male960Jpg], [320, 640, 960]),
  },
};

// Both public grids use 1 / 2 / 4 columns, 16–24px gutters and a container.
export const runnerCardImageSizes =
  "(min-width: 1536px) 354px, (min-width: 1280px) 290px, " +
  "(min-width: 1024px) 226px, (min-width: 768px) 356px, " +
  "(min-width: 640px) 292px, calc(100vw - 32px)";
