import "./globals.css";
import { getSiteChrome } from "@/lib/request";
import { TopNavPC } from "@/components/TopNavPC";
import { TopNavMobile } from "@/components/TopNavMobile";
import { Footer } from "@/components/Footer";

// Port of header.html's <head> block plus php/top.php / php/bottom.php, which
// legacy renders around every channel's content the same way. Layout is the
// natural place for the nav/footer that index.php wraps every page in — each
// page (home, list, goods detail, ...) only needs to render its own
// `<div id="contents">` content.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { device, config, topBanners, categories, topMenu, bankAccounts, member } = await getSiteChrome();
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
      <body>
        {device === "mobile" ? (
          <TopNavMobile
            logo={topBanners.LOGO ?? []}
            topMenu={topMenu}
            categories={categories}
            compTel={config.compTel}
            member={member}
          />
        ) : (
          <TopNavPC
            logo={topBanners.LOGO ?? []}
            topBanner={topBanners.TOPL ?? []}
            topMenu={topMenu}
            categories={categories}
            member={member}
          />
        )}

        {children}

        <div className="empty40" />
        <Footer config={config} bankAccounts={bankAccounts} device={device} />
      </body>
    </html>
  );
}
