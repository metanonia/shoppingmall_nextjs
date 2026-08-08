// Dev-only seed data for the Phase 1 Home page vertical slice.
// Mirrors the shape of install/install_post.php's default seed rows
// (banner uid 1-8, mobile_banner uid 1-3) plus enough goods/cate/exhibition
// data to exercise every branch of main.php's section-rendering logic.
process.loadEnvFile(require("node:path").join(__dirname, "..", ".env"));

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("../generated/client");

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const now = Math.floor(Date.now() / 1000);
const ALWAYS_ON = { s_date: new Date("1000-01-01T00:00:00"), e_date: new Date("1000-01-01T23:59:59") };

async function main() {
  await prisma.$transaction([
    prisma.banner.deleteMany(),
    prisma.mobileBanner.deleteMany(),
    prisma.exhibitionGoods.deleteMany(),
    prisma.goods.deleteMany(),
    prisma.goodsCate.deleteMany(),
    prisma.cate.deleteMany(),
    prisma.exhibition.deleteMany(),
    prisma.configuration.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.memberLevel.deleteMany(),
    prisma.member.deleteMany(),
    prisma.popup.deleteMany(),
    prisma.boardComment.deleteMany(),
    prisma.boardPost.deleteMany(),
    prisma.addPage.deleteMany(),
  ]);

  await prisma.configuration.create({
    data: {
      uid: 1,
      basic_url: "http://localhost:3000",
      basic_name: "SHOP NEXT",
      basic_admin: "admin",
      basic_email: "admin@example.com",
      basic_title: "SHOP NEXT - 데일리룩 셀렉샵",
      basic_description: "매일 새로운 데일리룩을 만나보세요",
      basic_keyword: "패션,의류,쇼핑몰",
      comp_name: "(주)샵넥스트",
      comp_owner: "홍길동",
      comp_license_no1: "123-45-67890",
      comp_license_no2: "2024-서울강남-1234",
      comp_tel: "1588-0000",
      comp_address1: "서울특별시 강남구 테헤란로 123",
      comp_address2: "샵넥스트빌딩 4층",
      basic_cs_time1: "09:00 ~ 18:00",
      basic_cs_time4: "12:00 ~ 13:00",
      design_skin: "seriesWhite",
      design_top_menu:
        "BEST|/best|1|*|NEW|/new|1|*|EVENT|/exhibition_list|1|*|공지사항|/board/notice|1|*|FAQ|/board/faq|1|*|1:1문의|/board/counsel|1|*|갤러리|/board/gallery|1",
      design_main_display_order: "reco, code, best, cate, new",
      // display_check_arr: reco=>2, best=>1, new=>3
      design_main_display1: 2, // best: 상품이동형
      design_main_display2: 3, // reco: 상품그룹이동형
      design_main_display3: 1, // new: 리스트형 (swiper 비활성)
      design_main_category: 2, // cate: 상품이동형
      design_main_category_info: "100|1|1",
      design_vendor_link: 1, // Phase 8: footer "입점신청"/"입점사로그인" 링크 노출
      design_main_custom_code: 1,
      design_main_custom_code_info: "<p style='text-align:center;padding:40px 0;'>이번 시즌 신규 입점 브랜드를 만나보세요</p>",
      mobile_top_menu:
        "BEST|/best|1|*|NEW|/new|1|*|EVENT|/exhibition_list|1|*|공지사항|/board/notice|1|*|FAQ|/board/faq|1|*|1:1문의|/board/counsel|1|*|갤러리|/board/gallery|1",
      mobile_yn: "Y",
      goods_price_limit1: 0,
      goods_price_limit2: 1,
      payment_type_b: 1, // bank transfer (Phase 4)
      payment_type_c: 1, // card (Phase 5) — payment_cp left blank so it resolves to the Mock gateway until real Aronhub credentials exist
      payment_type_h: 1, // mobile/phone (Phase 5), same Mock fallback
      signdate: now,
    },
  });

  // uid=2: member/agreement settings — legacy reuses the same wide
  // mallRN_configuration table for this, not a separate table (php/init.php:90).
  await prisma.configuration.create({
    data: {
      uid: 2,
      member_auth: "A", // A = 가입시 자동승인
      member_mileage_yn: "N",
      member_limit_count: 5,
      member_limit_minute: 10,
      agreement_info1: "<p>이용약관 내용 (샘플)</p><p>본 약관은 {SYEAR}년 {SMONTH}월 {SDAY}일부터 시행합니다. ({SHOPNAME} / {COMPANY})</p>",
      agreement_info2: "<p>개인정보처리방침 내용 (샘플)</p><p>개인정보 관리책임자: {MANAGERNAME} ({MANAGERTEL}, {MANAGEREMAIL})</p>",
      agreement_info3: "<p>개인정보 수집 및 이용에 동의합니다. 수집 항목: {JOINFORM}</p>",
      signdate: now,
    },
  });

  await prisma.memberLevel.createMany({
    data: [
      { uid: 1, level: 100, name: "관리자", signdate: now },
      { uid: 2, level: 1, name: "일반회원", signdate: now },
    ],
  });

  // Phase 7 backoffice login: id=admin / password=admin1234 (pre-hashed
  // below, same rationale as the Phase 6 guest board password — seed.js has
  // no @node-rs/argon2 dependency of its own, see that comment for why).
  await prisma.member.create({
    data: {
      id: "admin",
      name: "관리자",
      passwd: "$argon2id$v=19$m=19456,t=2,p=1$B/MisCNlbL9gBaiDUoa7yQ$gd7W1qxfUgdYEvh0EMqeFmTEVKCG6Jtc0PPbuG1qF80",
      email: "admin@example.com",
      level: 100,
      signdate: now,
    },
  });

  await prisma.cate.createMany({
    data: [
      { uid: 1, cate: 100n, cate_name: "여성의류", cate_dep: 1, cate_parent: 0n, cate_sub: 1, used: 1, sequence: 1 },
      { uid: 2, cate: 200n, cate_name: "남성의류", cate_dep: 1, cate_parent: 0n, cate_sub: 1, used: 1, sequence: 2 },
      { uid: 3, cate: 300n, cate_name: "가방/잡화", cate_dep: 1, cate_parent: 0n, cate_sub: 0, used: 1, sequence: 3 },
      { uid: 4, cate: 400n, cate_name: "신발", cate_dep: 1, cate_parent: 0n, cate_sub: 0, used: 1, sequence: 4 },
      { uid: 5, cate: 101n, cate_name: "원피스", cate_dep: 2, cate_parent: 100n, cate_sub: 0, used: 1, sequence: 1 },
      { uid: 6, cate: 102n, cate_name: "아우터", cate_dep: 2, cate_parent: 100n, cate_sub: 0, used: 1, sequence: 2 },
    ],
  });

  await prisma.exhibition.createMany({
    data: [
      {
        uid: 1,
        name: "가을 시즌 오프",
        discount_yn: "Y",
        discount: 15,
        status: 2,
        image1: "goods-04.svg",
        detail_image_only: 0,
        explains: "<p>가을 시즌을 맞아 준비한 특별 할인 모음전입니다.</p>",
        // A real discount window (unlike ALWAYS_ON's 1000-01-01 sentinel,
        // which is meant for "no restriction" banners/popups, not a
        // discount campaign's own displayed date range).
        s_date: new Date(Date.UTC(2026, 7, 1)),
        e_date: new Date(Date.UTC(2026, 8, 30)),
        signdate: now,
      },
      {
        uid: 2,
        name: "겨울 신상 프리뷰",
        discount_yn: "N",
        status: 1,
        image1: "goods-12.svg",
        explains: "<p>다가오는 겨울 시즌 신상품을 미리 만나보세요.</p>",
        ...ALWAYS_ON,
        signdate: now,
      },
    ],
  });

  await prisma.vendor.create({
    data: {
      uid: 1,
      id: "vendor01",
      auth: "Y",
      sell: "A",
      comp_name: "데일리클로젯",
      comp_owner: "김민지",
      comp_license_no: "234-56-78901",
      comp_address1: "서울특별시 마포구 월드컵로 45",
      comp_address2: "3층",
      comp_email: "contact@dailycloset.example.com",
      comp_tel: "02-1234-5678",
      comp_fax: "02-1234-5679",
      signdate: now,
    },
  });

  const goodsSeed = [
    { uid: 10000, name: "플리츠 원피스", cate: 100n, price: 59000, image2: "goods-01.svg", best: 1, reco: 0, new: 0, icon: "icons_001.png" },
    { uid: 10001, name: "캐시미어 니트", cate: 100n, price: 79000, image2: "goods-02.svg", best: 1, reco: 1, new: 0, icon: "" },
    { uid: 10002, name: "와이드 슬랙스", cate: 200n, price: 49000, image2: "goods-03.svg", best: 1, reco: 0, new: 1, icon: "" },
    { uid: 10003, name: "트렌치 코트", cate: 100n, price: 129000, image2: "goods-04.svg", best: 1, reco: 1, new: 0, icon: "icons_002.png", exhibition: ",1," },
    { uid: 10004, name: "미니 크로스백", cate: 300n, price: 39000, image2: "goods-05.svg", best: 0, reco: 1, new: 1, icon: "", vendor: "vendor01", storeBest: 1 },
    { uid: 10005, name: "가죽 스니커즈", cate: 400n, price: 69000, image2: "goods-06.svg", best: 0, reco: 1, new: 0, icon: "", vendor: "vendor01", storeBest: 2 },
    { uid: 10006, name: "울 머플러", cate: 100n, price: 29000, image2: "goods-07.svg", best: 0, reco: 0, new: 1, icon: "", vendor: "vendor01"},
    { uid: 10007, name: "실크 블라우스", cate: 100n, price: 45000, image2: "goods-08.svg", best: 0, reco: 0, new: 1, icon: "icons_003.png" },
    { uid: 10008, name: "데님 와이드 팬츠", cate: 200n, price: 55000, image2: "goods-09.svg", best: 0, reco: 0, new: 0, icon: "" },
    { uid: 10009, name: "후드 집업", cate: 200n, price: 42000, image2: "goods-10.svg", best: 0, reco: 0, new: 0, icon: "" },
    { uid: 10010, name: "플리츠 미니스커트", cate: 100n, price: 35000, image2: "goods-11.svg", best: 0, reco: 0, new: 0, soldout: true, icon: "" },
    { uid: 10011, name: "캐시미어 롱코트", cate: 100n, price: 189000, image2: "goods-12.svg", best: 0, reco: 0, new: 0, icon: "" },
  ];

  let seq = { best: 1, reco: 1, new: 1, cate: 1 };
  for (const g of goodsSeed) {
    await prisma.goods.create({
      data: {
        uid: g.uid,
        cate: g.cate,
        name: g.name,
        name_code_able: g.name,
        price: g.price,
        orig_price: Math.round(g.price * 0.7),
        consumer_price: Math.round(g.price * 1.2),
        image1: g.image2,
        image2: g.image2,
        image3: g.image2,
        icon: g.icon ?? "",
        option_use: 0,
        qty_type: 1,
        qty: g.soldout ? 0 : 100,
        display_use: 1,
        sale_use: g.soldout ? 0 : 1,
        order_priority: 5,
        main1_display1: g.best,
        main1_display1_sequence: g.best ? seq.best++ : 99999,
        main1_display2: g.reco,
        main1_display2_sequence: g.reco ? seq.reco++ : 99999,
        main1_display3: g.new,
        main1_display3_sequence: g.new ? seq.new++ : 99999,
        main2_display1: g.cate === 100n ? 1 : 0,
        main2_display1_sequence: g.cate === 100n ? seq.cate++ : 99999,
        exhibition: g.exhibition ?? "",
        vendor: g.vendor ?? "",
        store_display1: g.storeBest ? 1 : 0,
        store_display1_sequence: g.storeBest ?? 99999,
        auth_ck: "Y",
        cate_hide: 0,
        vendor_hide: 0,
        moddate: now,
        signdate: now,
      },
    });
    await prisma.goodsCate.create({
      data: { guid: g.uid, cate: g.cate, cate_rep: 1, sequence: 0 },
    });
  }

  // 모음전(exhibition) 상품 연결 — 겨울 신상 프리뷰(uid 2)에 몇 개 매핑
  await prisma.exhibitionGoods.createMany({
    data: [
      { euid: 1, guid: 10003, ecate: 0, sequence: 1 },
      { euid: 1, guid: 10000, ecate: 0, sequence: 2 },
      { euid: 1, guid: 10011, ecate: 0, sequence: 3 },
      { euid: 2, guid: 10007, ecate: 0, sequence: 1 },
      { euid: 2, guid: 10009, ecate: 0, sequence: 2 },
      { euid: 2, guid: 10011, ecate: 0, sequence: 3 },
    ],
  });

  const pcBanners = [
    { uid: 1, name: "로고", code: "LOGO", image1: "LOGO_image.jpg", link1: "/", sequence: 1 },
    { uid: 2, name: "상단배너", code: "TOPL", image1: "TOPL_image.jpg", link1: "#", sequence: 1 },
    { uid: 3, name: "메인롤링 #1", code: "MAINT", image1: "MAINT_image.jpg", link1: "#", sequence: 1 },
    { uid: 4, name: "메인롤링 #2", code: "MAINT", image1: "MAINT_image.jpg", link1: "#", sequence: 2 },
    { uid: 5, name: "메인좌측 #1", code: "MAINCL", image1: "MAINCL_image.jpg", link1: "#", sequence: 1 },
    { uid: 6, name: "메인좌측 #2", code: "MAINCL", image1: "MAINCL_image.jpg", link1: "#", sequence: 2 },
    { uid: 7, name: "메인우측 #1", code: "MAINCR", image1: "MAINCR_image.gif", link1: "#", sequence: 1 },
    { uid: 8, name: "메인우측 #2", code: "MAINCR", image1: "MAINCR_image.gif", link1: "#", sequence: 2 },
  ];
  for (const b of pcBanners) {
    await prisma.banner.create({ data: { ...b, status: 0, target: 0, ...ALWAYS_ON, moddate: now, signdate: now } });
  }

  const mobileBanners = [
    { uid: 1, name: "로고", code: "LOGO", image1: "LOGO_image.jpg", link1: "/", sequence: 1 },
    { uid: 2, name: "메인롤링 #1", code: "MAINT", image1: "MAINT_image.jpg", link1: "#", sequence: 1 },
    { uid: 3, name: "메인롤링 #2", code: "MAINT", image1: "MAINT_image.jpg", link1: "#", sequence: 2 },
  ];
  for (const b of mobileBanners) {
    await prisma.mobileBanner.create({ data: { ...b, status: 0, target: 0, ...ALWAYS_ON, moddate: now, signdate: now } });
  }

  // Demo popup so the feature is visible without an admin CRUD yet (Phase 7) —
  // one always-on, position1 (top-left) welcome popup on the home page.
  await prisma.popup.create({
    data: {
      name: "환영 팝업",
      status: 0,
      type: 0,
      period: 0,
      position: 1,
      input_size: "400|300",
      content: "<h3>환영합니다</h3><p>SHOP NEXT에 방문해 주셔서 감사합니다.</p>",
      signdate: now,
    },
  });

  // Board (Phase 6) — notice/faq are read-only (no admin write UI), so
  // their example content is seed-only, same principle as the popup above.
  // counsel/gallery get one guest-authored example each so the write/secret
  // flows aren't empty on first load. Guest password for both is "1234"
  // (pre-hashed below — `require("@node-rs/argon2")` isn't a declared
  // dependency of this package, unlike packages/auth).
  const DEMO_GUEST_PASSWD = "$argon2id$v=19$m=19456,t=2,p=1$plISJqlR+nQ5fw0gwJnd5A$So+AffWkT/yoEGJp/G5t/K5gn/jBqERM7+RLvi7P3fE";

  const boardPosts = [
    { board: "notice", notice: 1, subject: "SHOP NEXT 오픈 안내", content: "<p>SHOP NEXT가 오픈했습니다. 많은 이용 부탁드립니다.</p>", name: "admin" },
    { board: "notice", notice: 0, subject: "배송 지연 안내", content: "<p>일부 지역 배송이 지연될 수 있습니다. 양해 부탁드립니다.</p>", name: "admin" },
    { board: "faq", category: 0, subject: "주문 후 취소는 어떻게 하나요?", content: "<p>주문내역에서 주문취소 버튼으로 직접 취소하실 수 있습니다.</p>", name: "admin" },
    { board: "faq", category: 1, subject: "배송은 얼마나 걸리나요?", content: "<p>결제 완료 후 2~3일 이내 발송됩니다.</p>", name: "admin" },
    { board: "faq", category: 4, subject: "상품 재입고는 언제 되나요?", content: "<p>재입고 일정은 상품마다 다르며, 별도 안내드리지 않습니다.</p>", name: "admin" },
  ];
  for (const p of boardPosts) {
    await prisma.boardPost.create({
      data: {
        board: p.board,
        notice: p.notice ?? 0,
        category: p.category ?? 0,
        id: "",
        name: p.name,
        subject: p.subject,
        content: p.content,
        signdate: now,
      },
    });
  }

  const counselPost = await prisma.boardPost.create({
    data: {
      board: "counsel",
      category: 0,
      id: "",
      name: "게스트",
      subject: "배송 주소를 변경하고 싶어요",
      content: "<p>배송 전인데 주소를 변경할 수 있을까요?</p>",
      contact: "010-1234-5678",
      secret: 1,
      passwd: DEMO_GUEST_PASSWD,
      signdate: now,
    },
  });

  const galleryPost = await prisma.boardPost.create({
    data: {
      board: "gallery",
      id: "",
      name: "게스트",
      subject: "이번에 산 옷 너무 마음에 들어요",
      content: "<p>사이즈도 잘 맞고 색감도 예뻐요!</p>",
      passwd: DEMO_GUEST_PASSWD,
      comment_count: 1,
      signdate: now,
    },
  });
  await prisma.boardComment.create({
    data: { post_uid: galleryPost.uid, id: "", name: "관리자", content: "예쁘게 입어주셔서 감사합니다 :)", signdate: now },
  });

  await prisma.addPage.create({
    data: {
      uid: 1,
      title: "회사소개",
      detail_image_only: 0,
      explains: "<h3>SHOP NEXT</h3><p>고객과 함께 성장하는 데일리룩 셀렉샵입니다.</p>",
      status: 0,
      signdate: now,
    },
  });

  console.log(
    `Seeded: ${goodsSeed.length} goods, ${pcBanners.length} PC banners, ${mobileBanners.length} mobile banners, 6 categories, 1 exhibition, 1 popup, ${boardPosts.length + 2} board posts, 1 add_page.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
