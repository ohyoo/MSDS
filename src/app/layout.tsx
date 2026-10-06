import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UConn MSDS Curriculum Explorer",
  description: "Explore your MSDS learning journey, discover elective pathways, and connect data science foundations with your interests.",
  robots: { index: false, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
