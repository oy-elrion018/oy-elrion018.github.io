const KEYS = {
  REDIRECT_URL: "redirectUrl",
  STACK_SCREEN_TYPE: "stackScreenType",
};

const STACK_SCREEN_PAGES = [
  { path: "/m/mtn/magazine/editorial/", type: "magazineEditorial" },
  { path: "/m/mtn/magazine/weekly-magazine", type: "magazineWeekly" },
];

window.addEventListener("DOMContentLoaded", () => {
  main();
});

const replaceSubdomain = (url) => {
  return url.replace(/https:\/\/(maqa|ma)\./, (match, p1) => {
    return `https://${p1 === "ma" ? "m" : p1}.`;
  });
};

/**
 * 주어진 URL에 쿼리스트링을 붙여서 반환하는 함수
 */
const getUrlWithSearchParams = (url, searchParams) => {
  const urlObj = new URL(url);

  // 기존에 쿼리스트링이 있는 경우
  if (urlObj.search) {
    const currentSearchParams = new URLSearchParams(urlObj.search);
    searchParams.forEach((value, key) => {
      currentSearchParams.set(key, value);
    });

    urlObj.search = currentSearchParams.toString();

    return urlObj.toString();
  }

  // 기존에 쿼리스트링이 없는 경우
  urlObj.search = searchParams.toString();

  return urlObj.toString();
};

// ma 서브도메인인지 확인하는 함수
const checkSubDomainMa = (url) => {
  // url 의 쿼리스트링을 모두 제거한다.
  // redirectUrl 쿼리스트링이 디코딩이 안되어서 ma 서브도메인으로 확인되는 경우가 있음을 대비
  // 이후 ma 서브도메인인지 확인한다.
  const urlWithoutQueryString = url.split("?")[0];

  return urlWithoutQueryString.includes(`https://ma`);
};

const checkIsAosMobileChromeBrowser = () => {
  // 안드로이드 크롬 브라우저인지 확인
  // 카카오톡, 라인, 페이스북, 트위터, 슬랙, 팀즈 등의 앱의 웹뷰가 아니라는 것을 확인
  // 삼성 브라우저가 아니라는 것을 확인

  const userAgent = navigator.userAgent;

  return (
    /Android/.test(userAgent) &&
    /Chrome/.test(userAgent) &&
    !/wv/.test(userAgent) &&
    !/SamsungBrowser/.test(userAgent)
  );
};

const main = () => {
  // redirect URL 및 stackScreenType을 URL 쿼리스트링으로 받아온다.
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get(KEYS.REDIRECT_URL);
  const stackScreenType = params.get(KEYS.STACK_SCREEN_TYPE);

  // redirect URL이 없다면 아무것도 하지 않는다.
  if (!redirectUrl) {
    return;
  }

  // ma 서브도메인인 경우 동작하지않음 (중복 동작 방지)
  // m 도메인으로 이동 후 동작
  if (checkSubDomainMa(location.href)) {
    return;
  }

  // 브릿지페이지는 1초 뒤 가시성이 확인되면 리다이렉트 URL로 이동
  // 안드로이드 크롬 브라우저의 경우 5초 뒤 이동
  setTimeout(
    () => {
      location.replace(replaceSubdomain(redirectUrl));
    },
    checkIsAosMobileChromeBrowser() ? 5000 : 1000
  );

  // 스택스크린임을 알리는 파라미터를 추가하여 리다이렉트 URL로 스택스크린을 연다.
  const secondParams = new URLSearchParams({
    ...(KEYS.STACK_SCREEN_TYPE && stackScreenType
      ? {
          [KEYS.STACK_SCREEN_TYPE]: stackScreenType,
        }
      : (() => {
          const targetPage = STACK_SCREEN_PAGES.find((page) =>
            redirectUrl.includes(page.path)
          );

          return targetPage
            ? { [KEYS.STACK_SCREEN_TYPE]: targetPage.type }
            : {};
        })()),
  });

  location.href = getUrlWithSearchParams(
    "oliveyoungapp://movePage",
    new URLSearchParams({
      url: getUrlWithSearchParams(redirectUrl, secondParams),
    })
  );
};
