const axios = require('axios');
// This is the configuration. Specify your Octo API Token here; you can modify this for your personal needs
const config = {
    octo_token: "eb8653a18024e2d604e488d5aca5ed5f", // Specify your API token here
    octo_api_base_url: "https://dog.uomime.com/api/v2/automation",
    data: {
        
        "bookmarks": [
            { "name": "google", "url": "https://google.com" },
            { "name": "facebook", "url": "https://facebook.com" }
        ],
        "start_pages": ["https://google.com", "https://facebook.com"]
    }
}
const OCTO_REMOTE_API = axios.create({
    baseURL: config.octo_api_base_url,
    timeout: 10000,
    headers: {
        'X-Octo-Api-Token': config.octo_token,
        'Content-Type': "application/json"
    }
});
//functions
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
}
async function check_limits(response) {
    function parse_int_safe(value) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    const ratelimit_header = response.headers.ratelimit;
    if (!ratelimit_header) {
        console.warn('No ratelimit header found!');
        return;
    }
    const limit_entries = ratelimit_header.split(',').map(entry => entry.trim());
    for (const entry of limit_entries) {
        const name_match = entry.match(/^([^;]+)/);
        const r_match = entry.match(/;r=(\d+)/);
        const t_match = entry.match(/;t=(\d+)/);
        if (!r_match || !t_match) {
            console.warn(`Invalid ratelimit format: ${entry}`);
            continue;
        }
        const limit_name = name_match ? name_match[1] : 'unknown_limit';
        const remaining_quantity = parse_int_safe(r_match[1]);
        const window_seconds = parse_int_safe(t_match[1]);
        if (remaining_quantity < 5) {
            const wait_time = window_seconds + 1;
            console.log(`Waiting ${wait_time} seconds due to ${limit_name} limit`);
            await sleep(wait_time);
        }
    }
}
async function get_total_profiles() {
    const response = await OCTO_REMOTE_API.get('/profiles?page=0&page_len=10');
    const total_profiles = response.data.total_count;
    const total_pages = Math.ceil(response.data.total_count / 100);
    console.log(`Total Profiles: ${total_profiles}\nTotal Pages: ${total_pages}`);
    await check_limits(response);
    return total_pages;
}
async function get_all_profiles_uuids(total_pages) {
    let profiles = [];
    for (let i = 0; i < total_pages; i++) {
        let response = await OCTO_REMOTE_API.get(`/profiles?page=${i}&page_len=100`);
        await check_limits(response);
        profiles.push(...response.data.data);
    }
    return profiles;
}
async function patch_all_profiles(profiles) {
    let updated = [];
    let not_updated = [];
    for (let profile of profiles) {
        try {
            const response = await OCTO_REMOTE_API.patch(`/profiles/${profile.uuid}`, config.data);
            await check_limits(response);
            updated.push(profile);
            console.log(`Successfully updated ${profile.uuid}`);
        } catch (error) {
            not_updated.push(profile);
            console.error(`ERROR: Can't patch profile ${profile.uuid}`);
        }
    }
    return [updated, not_updated];
}
(async () => {
    const total = await get_total_profiles();
    const profiles = await get_all_profiles_uuids(total);
    const [updated, not_updated] = await patch_all_profiles(profiles);
    console.log(`Finished process:\nUpdated: ${updated.length}\nNot updated: ${not_updated.length}`);
})();