import "./globals.css";

export const metadata = {
  title: "SHOP NEXT 관리자",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
