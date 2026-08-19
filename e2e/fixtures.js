import path from "node:path";
import {fileURLToPath} from "node:url";

import {Builder, By, until} from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";

import {DEFAULT_OPTIONS} from "../option-defaults.js";

const EXTENSION_PATH = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../dist-firefox",
);

const ADDON_ID = "skipredirect@sblask";
// Pin the internal UUID so the options page has a predictable URL. Firefox
// randomises moz-extension:// UUIDs per profile unless this preference is set.
const INTERNAL_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const OPTIONS_URL = `moz-extension://${INTERNAL_UUID}/options/options.html`;

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS);

async function buildDriver() {
    const options = new firefox.Options();
    if (process.env.HEADLESS !== "false") {
        options.addArguments("-headless");
    }
    options.setPreference(
        "extensions.webextensions.uuids",
        JSON.stringify({[ADDON_ID]: INTERNAL_UUID}),
    );

    // Firefox only allows navigating to and opening moz-extension:// pages from
    // a system principal, which in turn requires geckodriver to launch Firefox
    // with --allow-system-access.
    const service = new firefox.ServiceBuilder().addArguments("--allow-system-access");

    return new Builder()
        .forBrowser("firefox")
        .setFirefoxOptions(options)
        .setFirefoxService(service)
        .build();
}

async function openOptionsPage(driver) {
    // driver.get() navigates with a content principal, which Firefox refuses for
    // moz-extension:// URLs. Opening the tab from the chrome context with the
    // system principal is the supported way to reach an extension page.
    await driver.setContext(firefox.Context.CHROME);
    await driver.executeScript(
        `
            const win = Services.wm.getMostRecentWindow("navigator:browser");
            win.gBrowser.selectedTab = win.gBrowser.addTab(arguments[0], {
                triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
            });
        `,
        OPTIONS_URL,
    );
    await driver.setContext(firefox.Context.CONTENT);

    const handles = await driver.getAllWindowHandles();
    await driver.switchTo().window(handles[handles.length - 1]);
    await driver.wait(until.elementLocated(By.id("skip-urls-list")), 10000);
}

export async function getStorage(driver) {
    return driver.executeAsyncScript(
        `
            const callback = arguments[arguments.length - 1];
            window.browser.storage.local.get().then(callback);
        `,
    );
}

export async function setStorage(driver, values) {
    await driver.executeAsyncScript(
        `
            const callback = arguments[arguments.length - 1];
            window.browser.storage.local.set(arguments[0]).then(() => callback());
        `,
        values,
    );
}

export async function pollStorage(driver, predicate, timeout = 8000) {
    const start = Date.now();
    let latest;
    while (Date.now() - start < timeout) {
        latest = await getStorage(driver);
        if (predicate(latest)) {
            return latest;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`storage never satisfied predicate, last value: ${JSON.stringify(latest)}`);
}

export async function reloadOptionsPage(driver) {
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.id("skip-urls-list")), 10000);
}

// Runs the callback against a freshly launched Firefox with the extension
// installed and the options page open
export async function withOptionsPage(run) {
    const driver = await buildDriver();
    try {
        await driver.installAddon(EXTENSION_PATH, true);
        // Storage APIs are only available from an extension page, not the
        // initial about:blank tab opened by WebDriver.
        await openOptionsPage(driver);
        // Wait until the background script has set the default option values,
        await pollStorage(driver, (stored) => (
            OPTION_KEYS.every((key) => stored[key] !== undefined)
        ));
        await run(driver);
    } finally {
        await driver.quit();
    }
}
