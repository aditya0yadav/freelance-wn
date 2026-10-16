from playwright.sync_api import sync_playwright

info = start_profile(PROFILE_UUID)   # from the starter script

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(info["ws_endpoint"])
    context = browser.contexts[0]        # the profile's existing browser context

    page1 = context.new_page()           # opens tab 1
    page1.goto("https://example.com")

    page2 = context.new_page()           # opens tab 2
    page2.goto("https://example.org")

    print(len(context.pages))            # how many tabs are open
    page1.bring_to_front()               # switch to tab 1