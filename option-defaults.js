export const OPTION_MODE = "mode";

export const OPTION_MODE_OFF = "off";
export const OPTION_MODE_NO_SKIP_URLS_LIST = "blacklist";
export const OPTION_MODE_SKIP_URLS_LIST = "whitelist";

export const OPTION_NO_SKIP_PARAMETERS_LIST = "no-skip-parameters-list";
export const OPTION_NO_SKIP_URLS_LIST = "blacklist";
export const OPTION_SKIP_URLS_LIST = "whitelist";
export const OPTION_SYNC_LISTS_ENABLED = "syncListsEnabled";

export const OPTION_NOTIFICATION_POPUP_ENABLED = "notificationPopupEnabled";
export const OPTION_NOTIFICATION_DURATION = "notificationDuration";

export const OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN = "skipRedirectsToSameDomain";

export const OPTION_CONTEXT_MENU_ENABLED = "contextMenuEnabled";

const DEFAULT_NO_SKIP_PARAMETERS_LIST = [
    "from",
    "ref",
    "ref_url",
    "referer",
    "referrer",
    "source",
];

const DEFAULT_NO_SKIP_URLS_LIST = [
    "/abp",
    "/account",
    "/adfs",
    "/auth",
    "/cookie",
    "/download",
    "/eid-client",
    "/login",
    "/logoff",
    "/logon",
    "/logout",
    "/oauth",
    "/openid",
    "/pay",
    "/preference",
    "/profile",
    "/register",
    "/saml",
    "/signin",
    "/signoff",
    "/signon",
    "/signout",
    "/signup",
    "/sso",
    "/subscribe",
    "/unauthenticated",
    "/verification",
];

export const DEFAULT_OPTIONS = {
    [OPTION_CONTEXT_MENU_ENABLED]: true,
    [OPTION_MODE]: OPTION_MODE_NO_SKIP_URLS_LIST,
    [OPTION_NOTIFICATION_DURATION]: 3,
    [OPTION_NOTIFICATION_POPUP_ENABLED]: true,
    [OPTION_NO_SKIP_PARAMETERS_LIST]: DEFAULT_NO_SKIP_PARAMETERS_LIST,
    [OPTION_NO_SKIP_URLS_LIST]: DEFAULT_NO_SKIP_URLS_LIST,
    [OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN]: false,
    [OPTION_SKIP_URLS_LIST]: [],
    [OPTION_SYNC_LISTS_ENABLED]: false,
};
