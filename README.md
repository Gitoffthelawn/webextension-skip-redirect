[![pre-commit Status](https://github.com/sblask/webextension-skip-redirect/actions/workflows/pre-commit.yml/badge.svg)](https://github.com/sblask/webextension-skip-redirect/actions/workflows/pre-commit.yml)

Skip Redirect
=====================
[![Mozilla Add-ons](https://user-images.githubusercontent.com/585534/107280546-7b9b2a00-6a26-11eb-8f9f-f95932f4bfec.png)](https://addons.mozilla.org/en-US/firefox/addon/skip-redirect/)
[![Chrome Web Store](https://user-images.githubusercontent.com/585534/107280622-91a8ea80-6a26-11eb-8d07-77c548b28665.png)](https://chrome.google.com/webstore/detail/skip-redirect/jaoafjdoijdconemdmodhbfpianehlon)

Some web pages use intermediary pages before redirecting to a final page. This
webextension tries to extract the final url from the intermediary url and goes
there straight away if successful. As an example, try this url:

 - https://www.google.com/chrome/?or-maybe-rather-firefox=https%3A%2F%2Fwww.mozilla.org/

Please give feedback (see below) if you find websites where this fails or where
you get redirected in a weird way when this add-on is enabled but not when it's
disabled.

See the add-on's preferences (also available by clicking the toolbar icon) for
options.

By default all URLs but the ones matching a no-skip-urls-list are checked for
embedded URLs and redirects are skipped. Depending on the pages visited, this
can cause problems. For example a dysfunctional login. The no-skip-urls-list
can be edited to avoid these problems. There is also a skip-urls-list mode to
avoid this kind of problem altogether. In skip-urls-list mode, all URLs for
which redirects should be skipped need to be added to the skip-urls-list
manually.

Some websites use multiple url parameters like this:

`www.example.com/page-we-want-to-skip?first=www.want-to-go-here.com&second=www.do-not-care-about-this-url.com`

Skip Redirect does not know which is the right parameter, but you can edit the
no-skip-parameter-list. Adding `first` would skip to the URL of `second` and
vice versa. Adding both, `first` and `second` would cause no skipping.

Privacy Policy
--------------

This extension does not collect or send data of any kind to third parties.

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/webextension-skip-redirect)

Patches are welcome.
