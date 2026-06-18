import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TiltCard } from "./TiltCard";

describe("TiltCard", () => {
  it("keeps dashboard hover shadows smooth while applying cursor tilt", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      <TiltCard className="dev-dash-stat">Revenue</TiltCard>,
    );

    expect(html).toContain("perspective(1100px)");
    expect(html).toContain("box-shadow");
  });
});
