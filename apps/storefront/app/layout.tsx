import "./globals.css";
import { getCachedShopConfig, getDevice } from "@/lib/request";

// Port of header.html's <head> block. Legacy loads a whole separate
// stylesheet per device (style.css vs mobile_style.css) rather than using
// responsive breakpoints in one file — see packages/core/src/device.ts.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [device, config] = await Promise.all([getDevice(), getCachedShopConfig()]);
  const styleHref = device === "mobile" ? "/skin/css/mobile_style.css" : "/skin/css/style.css";

  return (
    <html lang="ko">
      <head>
        <title>{config.basicTitle}</title>
        <meta charSet="utf-8" />
        {device === "mobile" && (
          <meta
            name="viewport"
            content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, width=device-width"
          />
        )}
        <meta name="keywords" content={config.basicKeyword} />
        <meta name="description" content={config.basicDescription} />
        <meta property="og:site_name" content={config.basicName} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={config.basicTitle} />
        <meta property="og:description" content={config.basicDescription} />
        <meta property="og:locale" content="ko_KR" />

        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap"
        />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xeicon@2.3.3/xeicon.min.css" />
        <link href={styleHref} rel="stylesheet" />

        {config.googleAnalytics && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${config.googleAnalytics}`} />
            <script
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.googleAnalytics}');`,
              }}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
