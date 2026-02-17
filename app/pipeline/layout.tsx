import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--pipeline-font",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--pipeline-mono",
  display: "swap",
});

export default function PipelineLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
      style={{ minHeight: "100vh", background: "#0A0C10" }}
    >
      {children}
    </div>
  );
}
