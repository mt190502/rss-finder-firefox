function updatePA(tabId, feedLinks) {
    if (feedLinks.length == 0) {
        console.log(`No feeds, so disabling action for tab ${tabId}...`);
        browser.action.disable(tabId);
        browser.action.setIcon({
            path: {
                "16": "/img/rss_grey_16.png",
                "48": "/img/rss_grey_48.png",
                "128": "/img/rss_grey_128.png",
                "512": "/img/rss_grey_512.png"
            },
            tabId: tabId
        });
        browser.action.setTitle({
            tabId: tabId,
            title: "RSS Finder"
        });
        return;
    }
    
    // Construct the new pop-up for this current tab
    browser.action.enable(tabId);
    browser.action.setTitle({
        tabId: tabId,
        title: `Found ${feedLinks.length} feed(s)`
    });
    browser.action.setIcon({
        path: {
            "16": "/img/rss_16.png",
            "48": "/img/rss_48.png",
            "128": "/img/rss_128.png",
            "512": "/img/rss_512.png"
        },
        tabId: tabId
    });
    console.log("Setting pop-up...");

    const url = new URL(browser.runtime.getURL('popup.html'));
    url.searchParams.set('feedLinks', JSON.stringify(feedLinks));
    console.log(url.toString());
    browser.action.setPopup({
        tabId: tabId,
        popup: url.toString()
    });
}

function scrapeFeedLinks() {
    console.log("Scraping links on current page");

    const YTChannel = "https://www.youtube.com/channel/";
    const YTUser = "https://www.youtube.com/user/";
    const YTRSS = "https://www.youtube.com/feeds/videos.xml?channel_id=";

    const FEEDS = document.querySelectorAll("link[type='application/rss+xml'], link[type='application/atom+xml']");

    // Need to map to prevent DataCloneError
    var feedLinks = Array.prototype.slice.call(FEEDS, 0)
        .map(feedLink => {
            return {
                type: feedLink.type,
                href: feedLink.href,
                title: feedLink.href
            };
        });

    if (window.location.href.startsWith(YTChannel)) {
        feedLinks = [window.location.href.replace(YTChannel, YTRSS)];
    } else if (window.location.href.startsWith(YTUser)) {
        feedLinks = [window.location.href];
    }

    console.log(`Found ${feedLinks.length} feeds on page...`);

    return feedLinks;
}

function scrapePage(tabId) {
    console.log("Scraping tab: " + tabId);
    browser.scripting.executeScript({
        target: {tabId: tabId},
        func: scrapeFeedLinks
    },
    (InjectionResults) => {
        console.log(InjectionResults);
        if (browser.runtime.lastError) {
            // Consume errors to do with browser.// urls
            // FIXME: Handle this in a cleaner wa
        }
        else {
            for (const feedLinks of InjectionResults) {
                console.log(`received ${feedLinks.result.length} results...`);
                updatePA(tabId, feedLinks.result);
            }
        }
    });
}

browser.runtime.onMessage.addListener((message, sender) => {
    console.log("received message from " + sender);
});

browser.tabs.onUpdated.addListener((tabId) => {
    browser.action.disable(tabId);
    scrapePage(tabId);
});

browser.tabs.onActivated.addListener((activeInfo) => {
    browser.action.disable(activeInfo.tabId);
    scrapePage(activeInfo.tabId);
});

browser.runtime.onInstalled.addListener(() => {
    browser.action.disable();
});