import {
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
} from "../option-defaults.js";

const ELEMENT_MODE_OFF = "mode-off";
const ELEMENT_MODE_NO_SKIP_URLS_LIST = "mode-no-skip-urls-list";
const ELEMENT_MODE_SKIP_URLS_LIST = "mode-skip-urls-list";

const ELEMENT_NO_SKIP_PARAMETERS_LIST = "no-skip-parameters-list";
const ELEMENT_NO_SKIP_URLS_LIST = "no-skip-urls-list";
const ELEMENT_SKIP_URLS_LIST = "skip-urls-list";
const ELEMENT_SYNC_LISTS_ENABLED = "sync-lists-enabled";

const ELEMENT_NO_SKIP_PARAMETERS_LIST_ERROR = "no-skip-parameters-list-error";
const ELEMENT_NO_SKIP_URLS_LIST_ERROR = "no-skip-urls-list-error";
const ELEMENT_SKIP_URLS_LIST_ERROR = "skip-urls-list-error";

const ELEMENT_NOTIFICATION_DURATION = "notification-duration";
const ELEMENT_NOTIFICATION_POPUP_ENABLED = "notification-popup-enabled";
const ELEMENT_SKIP_REDIRECTS_TO_SAME_DOMAIN = "skipRedirectsToSameDomain";

const ELEMENT_CONTEXT_MENU_ENABLED = "context-menu-enabled";

let timeout;

const OPTION_FIELDS = [
    [OPTION_CONTEXT_MENU_ENABLED, ELEMENT_CONTEXT_MENU_ENABLED, setBooleanValue],
    [OPTION_NOTIFICATION_DURATION, ELEMENT_NOTIFICATION_DURATION, setTextValue],
    [OPTION_NOTIFICATION_POPUP_ENABLED, ELEMENT_NOTIFICATION_POPUP_ENABLED, setBooleanValue],
    [OPTION_NO_SKIP_PARAMETERS_LIST, ELEMENT_NO_SKIP_PARAMETERS_LIST, setArrayValue],
    [OPTION_NO_SKIP_URLS_LIST, ELEMENT_NO_SKIP_URLS_LIST, setArrayValue],
    [OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN, ELEMENT_SKIP_REDIRECTS_TO_SAME_DOMAIN, setBooleanValue],
    [OPTION_SKIP_URLS_LIST, ELEMENT_SKIP_URLS_LIST, setArrayValue],
    [OPTION_SYNC_LISTS_ENABLED, ELEMENT_SYNC_LISTS_ENABLED, setBooleanValue],
];

async function restoreOptions() {
    const keys = [...OPTION_FIELDS.map(([key]) => key), OPTION_MODE];
    const result =  await browser.storage.local.get(keys);

    for (const [key, elementID, setValue] of OPTION_FIELDS) {
        setValue(elementID, result[key]);
    }
    applyMode(result[OPTION_MODE]);

    checkFormValues();
}

function applyStorageChanges(changes, areaName) {
    if (areaName !== "local") {
        return;
    }

    for (const [key, elementID, setValue] of OPTION_FIELDS) {
        if (key in changes) {
            setValue(elementID, changes[key].newValue);
        }
    }
    if (OPTION_MODE in changes) {
        applyMode(changes[OPTION_MODE].newValue);
    }

    checkFormValues();
}

function applyMode(mode) {
    switch (mode) {
        case OPTION_MODE_OFF:
            setBooleanValue(ELEMENT_MODE_OFF, true);
            break;
        case OPTION_MODE_NO_SKIP_URLS_LIST:
            setBooleanValue(ELEMENT_MODE_NO_SKIP_URLS_LIST, true);
            break;
        case OPTION_MODE_SKIP_URLS_LIST:
            setBooleanValue(ELEMENT_MODE_SKIP_URLS_LIST, true);
            break;
    }
}

function enableAutosave() {
    for (const input of document.querySelectorAll("input:not([type=radio]):not([type=checkbox]), textarea")) {
        input.addEventListener("input", delayedSaveOptions);
    }
    for (const input of document.querySelectorAll("input[type=radio], input[type=checkbox]")) {
        input.addEventListener("change", validateAndSaveOptions);
    }
}

function loadTranslations() {
    for (const element of document.querySelectorAll("[data-i18n]")) {
        if (typeof browser === "undefined" || !browser.i18n.getMessage(element.dataset.i18n)) {
            // fallback for testing directly in browser outside a webextension
            element.textContent = element.dataset.i18n;
        } else {
            element.textContent = browser.i18n.getMessage(element.dataset.i18n);
        }
    }
}

function setTextValue(elementID, newValue) {
    const oldValue = document.getElementById(elementID).value;

    if (oldValue !== newValue) {
        document.getElementById(elementID).value = newValue;
    }
}

function setBooleanValue(elementID, newValue) {
    document.getElementById(elementID).checked = newValue;
}

function setArrayValue(elementID, newValue) {
    setTextValue(elementID, newValue.join("\n"));
}

function getRegExpError(list) {
    for (const line of list) {
        try {
            new RegExp(line);
        } catch (exception) {
            return {
                line,
                message: exception.message,
            };
        }
    }
    return null;
}

function highlightError(error, listElementId, errorElementId) {
    const listElement = document.querySelector(`#${listElementId}`);
    const errorElement = document.querySelector(`#${errorElementId}`);
    if (error) {
        const {line, message} = error;
        listElement.classList.add("error");

        if (message.includes(line)) {
            errorElement.innerText = message;
        } else {
            errorElement.innerText = `${line}: ${message}`;
        }
    } else {
        listElement.classList.remove("error");
        errorElement.innerText = "";
    }
}

function validateList(listElementId, errorElementId) {
    const list = document.querySelector(`#${listElementId}`).value.split("\n");
    const error = getRegExpError(list);
    highlightError(error, listElementId, errorElementId);
    return error === null;
}

function checkFormValues() {
    const listsAreValid = [
        validateList(ELEMENT_NO_SKIP_URLS_LIST, ELEMENT_NO_SKIP_URLS_LIST_ERROR),
        validateList(ELEMENT_NO_SKIP_PARAMETERS_LIST, ELEMENT_NO_SKIP_PARAMETERS_LIST_ERROR),
        validateList(ELEMENT_SKIP_URLS_LIST, ELEMENT_SKIP_URLS_LIST_ERROR),
    ].every(Boolean);
    return listsAreValid;
}

function delayedSaveOptions(event) {
    clearTimeout(timeout);
    timeout = setTimeout(validateAndSaveOptions, 500, event);
}

function validateAndSaveOptions(event) {
    event.preventDefault();

    if (!checkFormValues()) {
        return;
    }

    saveOptions();
}

function saveOptions() {
    browser.storage.local.set({

        [OPTION_MODE]:
            document.querySelector(`#${ELEMENT_MODE_OFF}`).checked && OPTION_MODE_OFF
            || document.querySelector(`#${ELEMENT_MODE_NO_SKIP_URLS_LIST}`).checked && OPTION_MODE_NO_SKIP_URLS_LIST
            || document.querySelector(`#${ELEMENT_MODE_SKIP_URLS_LIST}`).checked && OPTION_MODE_SKIP_URLS_LIST,

        [OPTION_CONTEXT_MENU_ENABLED]: document.querySelector(`#${ELEMENT_CONTEXT_MENU_ENABLED}`).checked,
        [OPTION_NOTIFICATION_DURATION]: document.querySelector(`#${ELEMENT_NOTIFICATION_DURATION}`).value,
        [OPTION_NOTIFICATION_POPUP_ENABLED]: document.querySelector(`#${ELEMENT_NOTIFICATION_POPUP_ENABLED}`).checked,
        [OPTION_NO_SKIP_PARAMETERS_LIST]: document.querySelector(`#${ELEMENT_NO_SKIP_PARAMETERS_LIST}`).value.split("\n"),
        [OPTION_NO_SKIP_URLS_LIST]: document.querySelector(`#${ELEMENT_NO_SKIP_URLS_LIST}`).value.split("\n"),
        [OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN]: document.querySelector(`#${ELEMENT_SKIP_REDIRECTS_TO_SAME_DOMAIN}`).checked,
        [OPTION_SKIP_URLS_LIST]: document.querySelector(`#${ELEMENT_SKIP_URLS_LIST}`).value.split("\n"),
        [OPTION_SYNC_LISTS_ENABLED]: document.querySelector(`#${ELEMENT_SYNC_LISTS_ENABLED}`).checked,

    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.addEventListener("DOMContentLoaded", loadTranslations);
document.querySelector("form").addEventListener("submit", validateAndSaveOptions);

browser.storage.onChanged.addListener(applyStorageChanges);
