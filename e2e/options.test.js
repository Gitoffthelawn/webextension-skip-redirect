import test from "tape";
import {By} from "selenium-webdriver";

import {
    getStorage,
    pollStorage,
    reloadOptionsPage,
    setStorage,
    withOptionsPage,
} from "./fixtures.js";

import {
    DEFAULT_OPTIONS,
    OPTION_CONTEXT_MENU_ENABLED,
    OPTION_NOTIFICATION_DURATION,
    OPTION_NOTIFICATION_POPUP_ENABLED,
    OPTION_NO_SKIP_PARAMETERS_LIST,
    OPTION_NO_SKIP_URLS_LIST,
    OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN,
    OPTION_SKIP_URLS_LIST,
    OPTION_SYNC_LISTS_ENABLED,
} from "../option-defaults.js";

test("sets the default options on first install", (t) => withOptionsPage(async (driver) => {
    t.deepEqual(
        await getStorage(driver),
        DEFAULT_OPTIONS,
        "all defaults are stored",
    );

    t.equal(
        await driver.findElement(By.id("mode-no-skip-urls-list")).isSelected(),
        true,
        "no-skip URLs mode is selected",
    );
    t.equal(
        await driver.findElement(By.id("mode-off")).isSelected(),
        false,
        "off mode is not selected",
    );
    t.equal(
        await driver.findElement(By.id("mode-skip-urls-list")).isSelected(),
        false,
        "skip URLs mode is not selected",
    );

    const textOptions = [
        [OPTION_NO_SKIP_URLS_LIST, "no-skip-urls-list"],
        [OPTION_SKIP_URLS_LIST, "skip-urls-list"],
        [OPTION_NO_SKIP_PARAMETERS_LIST, "no-skip-parameters-list"],
    ];
    for (const [option, elementId] of textOptions) {
        t.equal(
            await driver.findElement(By.id(elementId)).getAttribute("value"),
            DEFAULT_OPTIONS[option].join("\n"),
            `${option} has its default value`,
        );
    }

    const checkboxOptions = [
        [OPTION_SYNC_LISTS_ENABLED, "sync-lists-enabled"],
        [OPTION_NOTIFICATION_POPUP_ENABLED, "notification-popup-enabled"],
        [OPTION_SKIP_REDIRECTS_TO_SAME_DOMAIN, "skipRedirectsToSameDomain"],
        [OPTION_CONTEXT_MENU_ENABLED, "context-menu-enabled"],
    ];
    for (const [option, elementId] of checkboxOptions) {
        t.equal(
            await driver.findElement(By.id(elementId)).isSelected(),
            DEFAULT_OPTIONS[option],
            `${option} has its default value`,
        );
    }

    t.equal(
        await driver.findElement(By.id("notification-duration")).getAttribute("value"),
        String(DEFAULT_OPTIONS[OPTION_NOTIFICATION_DURATION]),
        "notification duration has its default value",
    );
    t.end();
}));

test("persists option changes and restores them after reload", (t) => withOptionsPage(async (driver) => {
    const contextMenu = driver.findElement(By.id("context-menu-enabled"));
    t.equal(await contextMenu.isSelected(), true, "context menu enabled by default");
    await contextMenu.click();

    const skipUrlsList = driver.findElement(By.id("skip-urls-list"));
    await skipUrlsList.clear();
    await skipUrlsList.sendKeys("example.com\nexample.org");

    const duration = driver.findElement(By.id("notification-duration"));
    await duration.clear();
    await duration.sendKeys("7");

    await pollStorage(driver, (stored) => (
        stored[OPTION_CONTEXT_MENU_ENABLED] === false
        && JSON.stringify(stored[OPTION_SKIP_URLS_LIST]) === JSON.stringify(["example.com", "example.org"])
        && String(stored[OPTION_NOTIFICATION_DURATION]) === "7"
    ));

    await reloadOptionsPage(driver);

    t.equal(
        await driver.findElement(By.id("context-menu-enabled")).isSelected(),
        false,
        "checkbox change restored after reload",
    );
    t.equal(
        await driver.findElement(By.id("skip-urls-list")).getAttribute("value"),
        "example.com\nexample.org",
        "list change restored after reload",
    );
    t.equal(
        await driver.findElement(By.id("notification-duration")).getAttribute("value"),
        "7",
        "notification duration restored after reload",
    );

    t.end();
}));

test("does not save options while a list is invalid", (t) => withOptionsPage(async (driver) => {
    const skipUrlsList = driver.findElement(By.id("skip-urls-list"));
    await skipUrlsList.sendKeys("[");

    const errorMessage = driver.findElement(By.id("skip-urls-list-error"));
    await driver.wait(async () => (await errorMessage.getText()).length > 0, 5000);

    t.ok(
        (await skipUrlsList.getAttribute("class")).split(" ").includes("error"),
        "invalid list is highlighted",
    );
    t.ok(await errorMessage.getText(), "regular expression error is shown");

    const contextMenu = driver.findElement(By.id("context-menu-enabled"));
    await contextMenu.click();

    let stored = await getStorage(driver);
    t.deepEqual(stored[OPTION_SKIP_URLS_LIST], [], "invalid list is not saved");
    t.equal(
        stored[OPTION_CONTEXT_MENU_ENABLED],
        true,
        "other changes are not saved while an error exists",
    );

    await skipUrlsList.clear();
    await skipUrlsList.sendKeys("example.com");
    stored = await pollStorage(driver, (options) => (
        JSON.stringify(options[OPTION_SKIP_URLS_LIST]) === JSON.stringify(["example.com"])
        && options[OPTION_CONTEXT_MENU_ENABLED] === false
    ));

    t.deepEqual(stored[OPTION_SKIP_URLS_LIST], ["example.com"], "corrected list is saved");
    t.equal(await errorMessage.getText(), "", "error message is cleared");
    t.notOk(
        (await skipUrlsList.getAttribute("class")).split(" ").includes("error"),
        "error highlight is cleared",
    );

    t.end();
}));

test("external updates do not override unrelated edits", (t) => withOptionsPage(async (driver) => {
    const parametersList = driver.findElement(By.id("no-skip-parameters-list"));
    await parametersList.clear();
    await parametersList.sendKeys("direct edit");

    await setStorage(driver, {[OPTION_SKIP_URLS_LIST]: ["external update"]});

    await driver.wait(async () => (
        await driver.findElement(By.id("skip-urls-list")).getAttribute("value") === "external update"
    ), 5000);

    t.equal(
        await driver.findElement(By.id("no-skip-parameters-list")).getAttribute("value"),
        "direct edit",
        "direct edit is unchanged after external update on different field",
    );

    t.end();
}));
