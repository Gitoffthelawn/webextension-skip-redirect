import {
    DEFAULT_OPTIONS,
    OPTION_CONTEXT_MENU_ENABLED,
    OPTION_MODE,
    OPTION_MODE_NO_SKIP_URLS_LIST,
    OPTION_MODE_OFF,
    OPTION_MODE_SKIP_URLS_LIST,
    OPTION_NOTIFICATION_DURATION,
    OPTION_NOTIFICATION_POPUP_ENABLED,
    OPTION_NO_SKIP_PARAMETERS_LIST,
    OPTION_NO_SKIP_URLS_LIST,
    OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN,
    OPTION_SKIP_URLS_LIST,
    OPTION_SYNC_LISTS_ENABLED,
} from "./option-defaults.js";
import * as psl from "./psl.js";
import * as url from "./url.js";
import * as util from "./util.js";

const VARIABLE_LAST_SOURCE_URL = "lastSourceURL";

const LIST_OPTIONS = [
    OPTION_NO_SKIP_PARAMETERS_LIST,
    OPTION_NO_SKIP_URLS_LIST,
    OPTION_SKIP_URLS_LIST,
];

const TOOLBAR_CONTEXT_MENU_ID = "copy-last-source-url";
const LINK_CONTEXT_MENU_ID = "copy-target-url";

const NOTIFICATION_ID = "notify-skip";
const NOTIFICATION_ALARM_NAME = "clear-notification";

const ICON = "icon.svg";
const ICON_OFF = "icon-off.svg";
const ICON_NO_SKIP_URLS_LIST = "icon-no-skip-urls-list.svg";
const ICON_SKIP_URLS_LIST = "icon-skip-urls-list.svg";

const MAX_NOTIFICATION_URL_LENGTH = 100;

let currentMode = undefined;

let noSkipParametersList = [];
let noSkipUrlsList = [];
let skipUrlsList = [];
let skipUrlsExpression = undefined;

let notificationPopupEnabled = undefined;
let notificationDuration = undefined;

let skipRedirectsToSameDomain = false;
let syncLists = false;

let contextMenuEnabled = true;

const initializationPromise = initializeState()
    .catch((error) => {
        console.warn(`Could not initialize extension state: ${error.message}`);
    });

browser.webRequest.onBeforeRequest.addListener(
    maybeRedirect,
    {
        urls: ["<all_urls>"],
        types: ["main_frame"],
    },
    ["blocking"]
);

async function initializeState() {
    const result = await browser.storage.local.get([
        OPTION_CONTEXT_MENU_ENABLED,
        OPTION_MODE,
        OPTION_NOTIFICATION_DURATION,
        OPTION_NOTIFICATION_POPUP_ENABLED,
        OPTION_NO_SKIP_PARAMETERS_LIST,
        OPTION_NO_SKIP_URLS_LIST,
        OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN,
        OPTION_SKIP_URLS_LIST,
        OPTION_SYNC_LISTS_ENABLED,
    ]);

    if (result[OPTION_CONTEXT_MENU_ENABLED] === undefined) {
        browser.storage.local.set({[OPTION_CONTEXT_MENU_ENABLED]: DEFAULT_OPTIONS[OPTION_CONTEXT_MENU_ENABLED]});
    } else {
        contextMenuEnabled = result[OPTION_CONTEXT_MENU_ENABLED];
    }

    if (result[OPTION_NO_SKIP_PARAMETERS_LIST] === undefined) {
        browser.storage.local.set({[OPTION_NO_SKIP_PARAMETERS_LIST]: DEFAULT_OPTIONS[OPTION_NO_SKIP_PARAMETERS_LIST]});
    } else {
        updateNoSkipParametersList(result[OPTION_NO_SKIP_PARAMETERS_LIST]);
    }

    if (result[OPTION_NO_SKIP_URLS_LIST] === undefined) {
        browser.storage.local.set({[OPTION_NO_SKIP_URLS_LIST]: DEFAULT_OPTIONS[OPTION_NO_SKIP_URLS_LIST]});
    } else {
        updateNoSkipUrlsList(result[OPTION_NO_SKIP_URLS_LIST]);
    }

    if (result[OPTION_SKIP_URLS_LIST] === undefined) {
        browser.storage.local.set({[OPTION_SKIP_URLS_LIST]: DEFAULT_OPTIONS[OPTION_SKIP_URLS_LIST]});
    } else {
        updateSkipUrlsList(result[OPTION_SKIP_URLS_LIST]);
    }

    if (result[OPTION_MODE] === undefined) {
        browser.storage.local.set({[OPTION_MODE]: DEFAULT_OPTIONS[OPTION_MODE]});
        currentMode = DEFAULT_OPTIONS[OPTION_MODE];
    } else {
        currentMode = result[OPTION_MODE];
    }

    updateBrowserAction();

    if (result[OPTION_NOTIFICATION_POPUP_ENABLED] === undefined) {
        browser.storage.local.set({[OPTION_NOTIFICATION_POPUP_ENABLED]: DEFAULT_OPTIONS[OPTION_NOTIFICATION_POPUP_ENABLED]});
    } else {
        notificationPopupEnabled = result[OPTION_NOTIFICATION_POPUP_ENABLED];
    }

    if (result[OPTION_NOTIFICATION_DURATION] === undefined) {
        browser.storage.local.set({[OPTION_NOTIFICATION_DURATION]: DEFAULT_OPTIONS[OPTION_NOTIFICATION_DURATION]});
    } else {
        notificationDuration = result[OPTION_NOTIFICATION_DURATION];
    }

    if (result[OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN] === undefined) {
        browser.storage.local.set({[OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN]: DEFAULT_OPTIONS[OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN]});
    } else {
        skipRedirectsToSameDomain = result[OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN];
    }

    if (result[OPTION_SYNC_LISTS_ENABLED] === undefined) {
        browser.storage.local.set({[OPTION_SYNC_LISTS_ENABLED]: DEFAULT_OPTIONS[OPTION_SYNC_LISTS_ENABLED]});
    } else {
        syncLists = result[OPTION_SYNC_LISTS_ENABLED];
    }
}

browser.storage.onChanged.addListener(
    (changes, areaName) => {
        // options are stored in local area whereas variables are in session area
        if (areaName === "session") {
            return;
        }

        let initTriggered = false;
        if (changes[OPTION_SYNC_LISTS_ENABLED]) {
            const previousValue = syncLists;
            const newValue = changes[OPTION_SYNC_LISTS_ENABLED].newValue;
            syncLists = newValue;
            if (previousValue !== newValue && syncLists) {
                initTriggered = true;
                initSyncLists();
            }
        }

        if (changes[OPTION_NO_SKIP_PARAMETERS_LIST]) {
            updateNoSkipParametersList(changes[OPTION_NO_SKIP_PARAMETERS_LIST].newValue);
            if (!initTriggered) {
                maybeSyncList(areaName, OPTION_NO_SKIP_PARAMETERS_LIST, noSkipParametersList);
            }
        }

        if (changes[OPTION_NO_SKIP_URLS_LIST]) {
            updateNoSkipUrlsList(changes[OPTION_NO_SKIP_URLS_LIST].newValue);
            if (!initTriggered) {
                maybeSyncList(areaName, OPTION_NO_SKIP_URLS_LIST, noSkipUrlsList);
            }
        }

        if (changes[OPTION_SKIP_URLS_LIST]) {
            updateSkipUrlsList(changes[OPTION_SKIP_URLS_LIST].newValue);
            if (!initTriggered) {
                maybeSyncList(areaName, OPTION_SKIP_URLS_LIST, skipUrlsList);
            }
        }

        if (changes[OPTION_MODE]) {
            currentMode = changes[OPTION_MODE].newValue;
            updateBrowserAction();
        }

        if (changes[OPTION_NOTIFICATION_POPUP_ENABLED]) {
            notificationPopupEnabled = changes[OPTION_NOTIFICATION_POPUP_ENABLED].newValue;
        }

        if (changes[OPTION_NOTIFICATION_DURATION]) {
            notificationDuration = changes[OPTION_NOTIFICATION_DURATION].newValue;
        }

        if (changes[OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN]) {
            skipRedirectsToSameDomain = changes[OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN].newValue;
        }

        if (changes[OPTION_CONTEXT_MENU_ENABLED]) {
            contextMenuEnabled = changes[OPTION_CONTEXT_MENU_ENABLED].newValue;
            updateContextMenus();
        }
    }
);

browser.runtime.onInstalled.addListener(async () => {
    await initializationPromise;
    await updateContextMenus();
});

async function updateContextMenus() {
    await browser.contextMenus.removeAll();

    if (!contextMenuEnabled) {
        return;
    }

    browser.contextMenus.create({
        id: TOOLBAR_CONTEXT_MENU_ID,
        title: browser.i18n.getMessage("contextMenuToolbarLabel"),
        contexts: ["action"],
        enabled: false,
    });

    browser.contextMenus.create({
        id: LINK_CONTEXT_MENU_ID,
        title: browser.i18n.getMessage("contextMenuLinkLabel"),
        contexts: ["link"],
        enabled: true,
    });
}

browser.runtime.onStartup.addListener(async () => {
    await initializationPromise;
    if (contextMenuEnabled) {
        browser.contextMenus.update(TOOLBAR_CONTEXT_MENU_ID, {enabled: false});
    }
});

browser.contextMenus.onClicked.addListener(
    async (info, _tab) => {
        if (info.menuItemId === TOOLBAR_CONTEXT_MENU_ID) {
            const result = await browser.storage.session.get(VARIABLE_LAST_SOURCE_URL);
            const lastSourceUrl = result[VARIABLE_LAST_SOURCE_URL];
            if (lastSourceUrl === undefined) {
                await browser.contextMenus.update(TOOLBAR_CONTEXT_MENU_ID, {enabled: false});
                return;
            }
            await navigator.clipboard.writeText(lastSourceUrl);
        }
        if (info.menuItemId === LINK_CONTEXT_MENU_ID) {
            await initializationPromise;
            const redirectTarget = url.getRedirectTarget(info.linkUrl, noSkipUrlsList, noSkipParametersList);
            await navigator.clipboard.writeText(redirectTarget);
        }
    }
);

browser.alarms.onAlarm.addListener(
    (alarm) => {
        if (alarm.name === NOTIFICATION_ALARM_NAME) {
            clearNotifications();
        }
    }
);

function updateNoSkipParametersList(newNoSkipParametersList) {
    noSkipParametersList = newNoSkipParametersList.filter(Boolean);
}

function updateNoSkipUrlsList(newNoSkipUrlsList) {
    noSkipUrlsList = newNoSkipUrlsList.filter(Boolean);
}

function updateSkipUrlsList(newSkipUrlsList) {
    skipUrlsList = newSkipUrlsList.filter(Boolean);
    skipUrlsExpression = skipUrlsList.length > 0
        ? new RegExp(`(${skipUrlsList.join("|")})`, "i")
        : undefined;
}

function initSyncLists() {
    Promise.all([
        browser.storage.local.get(LIST_OPTIONS),
        browser.storage.sync.get(LIST_OPTIONS),
    ])
        .then(
            ([localResult, remoteResult]) => {
                LIST_OPTIONS.forEach((optionName) => {
                    const localValue = localResult[optionName];
                    const remoteValue = remoteResult[optionName];
                    const newValue = util.mergeList(localValue, remoteValue);

                    if (JSON.stringify(localValue) != JSON.stringify(newValue)) {
                        browser.storage.local.set({[optionName]: newValue});
                    }
                    if (JSON.stringify(remoteValue) != JSON.stringify(newValue)) {
                        browser.storage.sync.set({[optionName]: newValue});
                    }
                });
            }
        );
}

function maybeSyncList(changedArea, optionName, optionValue) {
    if (!syncLists) {
        return;
    }

    const toAreaName = changedArea === "local" ? "sync" : "local";
    const toArea = browser.storage[toAreaName];

    toArea.get([optionName]).then(
        (result) => {
            const targetValue = result[optionName];
            if (JSON.stringify(targetValue) !== JSON.stringify(optionValue)) {
                toArea.set({[optionName]: optionValue});
            }
        }
    );
}

function updateBrowserAction() {
    if (currentMode === OPTION_MODE_OFF) {
        browser.action.setIcon({path: ICON_OFF});
        browser.action.setTitle({title: browser.i18n.getMessage("browserActionLabelOff")});
        return;
    }

    browser.action.setTitle({title: browser.i18n.getMessage("browserActionLabelOn")});
    if (currentMode === OPTION_MODE_NO_SKIP_URLS_LIST) {
        browser.action.setIcon({path: ICON_NO_SKIP_URLS_LIST});
        return;
    }
    if (currentMode === OPTION_MODE_SKIP_URLS_LIST) {
        browser.action.setIcon({path: ICON_SKIP_URLS_LIST});
        return;
    }
}

async function maybeRedirect(requestDetails) {
    await initializationPromise;

    if (requestDetails.tabId === -1 || requestDetails.method !== "GET") {
        return;
    }

    if (currentMode === OPTION_MODE_OFF) {
        return;
    }

    if (
        currentMode === OPTION_MODE_SKIP_URLS_LIST
        && !skipUrlsExpression?.test(requestDetails.url)
    ) {
        return;
    }

    const parameterExceptions = noSkipParametersList;
    let urlExceptions = [];
    if (currentMode === OPTION_MODE_NO_SKIP_URLS_LIST) {
        urlExceptions = noSkipUrlsList;
    }

    const redirectTarget = url.getRedirectTarget(requestDetails.url, urlExceptions, parameterExceptions);
    if (redirectTarget === requestDetails.url) {
        return;
    }

    if (currentMode === OPTION_MODE_NO_SKIP_URLS_LIST && !skipRedirectsToSameDomain) {
        const sourceHostname = new URL(requestDetails.url).hostname;
        const targetHostname = new URL(redirectTarget).hostname;
        const sourceDomain = psl.getDomain(sourceHostname);
        const targetDomain = psl.getDomain(targetHostname);
        if (sourceDomain === targetDomain) {
            return;
        }
    }

    prepareToolbarContextMenu(requestDetails.url);
    notifySkip(requestDetails.url, redirectTarget);

    return {
        redirectUrl: redirectTarget,
    };
}

function prepareToolbarContextMenu(from) {
    browser.storage.session.set({[VARIABLE_LAST_SOURCE_URL]: from});
    if (contextMenuEnabled) {
        browser.contextMenus.update(TOOLBAR_CONTEXT_MENU_ID, {enabled: true});
    }
}

function notifySkip(from, to) {
    const notificationMessage = browser.i18n.getMessage("redirectSkippedNotificationMessage", [cleanUrl(from), cleanUrl(to)]);

    const toolbarButtonTitle = browser.i18n.getMessage("browserActionLabelOnSkipped", [from, to]);

    if (notificationPopupEnabled) {
        browser.notifications.create(NOTIFICATION_ID, {
            type: "basic",
            iconUrl: browser.runtime.getURL(ICON),
            title: browser.i18n.getMessage("redirectSkippedNotificationTitle"),
            message: notificationMessage,
        });
    }
    browser.action.setBadgeText({text: browser.i18n.getMessage("redirectSkippedBrowserActionBadge")});

    browser.action.setTitle({title: toolbarButtonTitle});

    browser.alarms.create(
        NOTIFICATION_ALARM_NAME,
        {when: Date.now() + 1000 * notificationDuration}
    );
}

function clearNotifications() {
    browser.notifications.clear(NOTIFICATION_ID);
    browser.action.setBadgeText({text: ""});
}

function cleanUrl(string) {
    if (string.length > MAX_NOTIFICATION_URL_LENGTH) {
        string = string.substring(0, MAX_NOTIFICATION_URL_LENGTH - 3) + "...";
    }

    return string.replace(/&/g, "&amp;");
}
