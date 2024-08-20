const KEYS = {
  REDIRECT_URL: "redirectUrl",
  STACK_SCREEN_TYPE: "stackScreenType",
  IS_APP_REQUIRED: "isAppRequired",
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
 * 현재 앱 정보를 반환하는 함수
 */
const getAppInfo = () => {
  const userAgent = navigator.userAgent;

  // userAgent가 없는 경우
  if (!userAgent) {
    return {
      appVersion: null,
      isApp: false,
      isIos: false,
      isAndroid: false,
    };
  }

  const lowercaseUserAgent = userAgent.toLowerCase();
  const appVerMatch = userAgent.match(/appVer\/([^ ]*)/);
  const deviceIdMatch = userAgent.match(/deviceId\/([^ ]*)/);

  return {
    appVersion: appVerMatch ? appVerMatch[1] : null,
    isApp: Boolean(appVerMatch && deviceIdMatch),
    isIos: Boolean(lowercaseUserAgent.match(/iphone|ipad|ipod/)),
    isAndroid: Boolean(lowercaseUserAgent.match(/android/)),
  };
};

/**
 * 앱스토어로 이동하는 함수
 */
const goAppStore = (isIos, isAndroid) => {
  if (isIos) {
    location.replace("https://itunes.apple.com/kr/app/id873779010?l=kr&mt=8");
  } else if (isAndroid) {
    location.replace(
      "https://play.google.com/store/apps/details?id=com.oliveyoung&hl=ko"
    );
  }
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

/**
 * 안드로이드 크롬 브라우저인지 확인하는 함수
 */
const checkIsAndroidMobileChromeBrowser = () => {
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
  const { isApp, isIos, isAndroid } = getAppInfo();

  // redirect URL 및 stackScreenType을 URL 쿼리스트링으로 받아온다.
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get(KEYS.REDIRECT_URL);
  const stackScreenType = params.get(KEYS.STACK_SCREEN_TYPE);
  const isAppRequired = params.get(KEYS.IS_APP_REQUIRED);

  // redirect URL이 없다면 아무것도 하지 않는다.
  if (!redirectUrl) {
    return;
  }

  // 앱에서 실행되는 경우
  // redirect URL로 이동한다.
  // 해당 분기 아래 코드는 모바일 웹에서만 동작한다.
  if (isApp) {
    location.replace(redirectUrl);

    return;
  }

  // ma 서브도메인인 경우 동작하지않음 (중복 동작 방지)
  // m 도메인으로 이동 후 동작
  if (checkSubDomainMa(location.href)) {
    return;
  }

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

  // 올리브영 앱으로 이동
  location.href = getUrlWithSearchParams(
    "oliveyoungapp://movePage",
    new URLSearchParams({
      url: getUrlWithSearchParams(redirectUrl, secondParams),
    })
  );

  if (isAppRequired) {
    // 앱이 필수로 설치되어야 하는 경우
    // 현재 페이지의 가시성을 확인하여 앱이 미설치된 경우에만 각 플랫폼의 스토어로 이동한다.
    // 현재 페이지의 가시성이 있다면 간접적으로 올리브영 앱이 설치되어 있지 않다는 것으로 판단한다.

    setTimeout(() => {
      if (document.visibilityState === "visible") {
        goAppStore(isIos, isAndroid);
      }
    }, 1000);
  } else {
    // 앱이 필수로 설치되어야 하는 경우가 아닌 경우
    // 브릿지페이지는 1초 뒤 가시성이 확인되면 리다이렉트 URL로 이동
    // 안드로이드 크롬 브라우저의 경우 5초 뒤 이동

    setTimeout(
      () => {
        location.replace(replaceSubdomain(redirectUrl));
      },
      checkIsAndroidMobileChromeBrowser() ? 5000 : 1000
    );
  }
};
