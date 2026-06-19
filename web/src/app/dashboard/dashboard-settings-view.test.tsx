import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { ThemeProvider } from "@/lib/theme/theme-provider";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({
    data: {
      user: {
        email: "developer@example.test",
        id: "dev_123",
      },
    },
    status: "authenticated",
  }),
}));

import { DashboardSettingsView } from "./dashboard-settings-view";

describe("DashboardSettingsView", () => {
  it("keeps the language dropdown above settings rows and exposes support email", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      <LocaleProvider initialLocale="en">
        <ThemeProvider>
          <DashboardSettingsView variant="developer" />
        </ThemeProvider>
      </LocaleProvider>,
    );

    expect(html).toContain('href="mailto:support@learnx.pro"');
    expect(html).toContain("support@learnx.pro");
    expect(html).toContain('data-settings-language="true"');
    expect(html).toContain("relative z-20");
  });
});
