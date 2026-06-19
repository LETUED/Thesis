// design-sync preview stub for next/image — renders a plain <img>.
import * as React from "react";

const Image = React.forwardRef<HTMLImageElement, Record<string, unknown>>(
  function Image(props, ref) {
    const {
      src,
      alt,
      width,
      height,
      fill,
      priority,
      loader,
      quality,
      placeholder,
      blurDataURL,
      sizes,
      ...rest
    } = props as Record<string, unknown>;
    const s =
      typeof src === "string"
        ? src
        : (src as { src?: string } | undefined)?.src ?? "";
    return React.createElement("img", {
      ref,
      src: s,
      alt: (alt as string) ?? "",
      width: width as number,
      height: height as number,
      ...rest,
    });
  },
);

export default Image;
