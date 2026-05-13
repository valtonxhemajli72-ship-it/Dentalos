import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DentalOS",
  description: "A clinic operating system starting with recall, reminders, and follow-up.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
