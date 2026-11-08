import "./globals.css";

export const metadata = {
  title: "Beecgaar — Nidaamka Maaraynta Dukaanka",
  description: "SaaS system for store and inventory management",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="so">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
