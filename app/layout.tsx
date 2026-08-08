import "./globals.css";

export const metadata = {
  title: "CarDhoondo",
  description: "Honest, unbiased car recommendations for first and second-time buyers in India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
