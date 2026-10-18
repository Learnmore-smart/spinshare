/** Install one-liners shown on the home page and developer setup guide. */

export type InstallOs = "windows" | "unix";

export interface InstallCommandVariant {
  os: InstallOs;
  /** Short label for the toggle / code-block heading. */
  label: string;
  command: string;
}

export const SPINSHARE_INSTALL_COMMANDS: InstallCommandVariant[] = [
  {
    os: "windows",
    label: "Windows · PowerShell",
    // Windows PowerShell aliases `curl` to Invoke-WebRequest (which rejects
    // -L/-o) and PowerShell 5.x rejects `&&`. Force the real curl.exe and only
    // install if the download succeeded.
    command:
      "curl.exe -L https://spinshare-web-vert.vercel.app/vsix -o spinshare.vsix; if ($?) { code --install-extension spinshare.vsix }",
  },
  {
    os: "unix",
    label: "macOS · Linux",
    command:
      "curl -L https://spinshare-web-vert.vercel.app/vsix -o spinshare.vsix && code --install-extension spinshare.vsix",
  },
];

/** Back-compat single command (bash/zsh form). */
export const SPINSHARE_INSTALL_COMMAND =
  SPINSHARE_INSTALL_COMMANDS.find((v) => v.os === "unix")!.command;

/** Pick the variant matching the visitor's platform; defaults to unix. */
export function detectInstallOs(userAgent: string | undefined | null): InstallOs {
  return userAgent && /Win(dows|32|64)/i.test(userAgent) ? "windows" : "unix";
}

export function installCommandFor(os: InstallOs): InstallCommandVariant {
  const match = SPINSHARE_INSTALL_COMMANDS.find((v) => v.os === os);
  return match ?? SPINSHARE_INSTALL_COMMANDS.find((v) => v.os === "unix")!;
}
