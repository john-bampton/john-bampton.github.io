/**
 * GitHub Faces - Developer Discovery Tool
 * Client-side filtering and sorting functionality
 *
 * @author Seyyed Ali Mohammadiyeh
 * @repository https://github.com/john-bampton/faces
 * @license MIT
 * @version 1.0.0
 *
 * Description:
 * Provides dynamic filtering, searching, and sorting capabilities for discovering
 * GitHub developers based on followers, repositories, forks, sponsors, and more.
 *
 * Features:
 * - Real-time search across name, login, and location
 * - Multi-range filtering (followers, repos, forks)
 * - Sponsor and sponsoring filters
 * - Avatar age-based filtering
 * - Dynamic sorting options
 * - Responsive card rendering
 * - Mobile-optimized filter panel
 *
 * Dependencies:
 * - HTML DOM with elements: searchInput, sortBy, filter dropdowns, grid, counts, messages
 * - Card elements with data attributes: data-followers, data-repos, data-forks, data-avatar-updated
 *
 * Usage:
 * Initialize with: document.addEventListener('DOMContentLoaded', initializeApp)
 * All filtering happens automatically via event listeners on filter controls.
 */
let allUsers = [];
let filteredUsers = [];
let isDataLoaded = false;

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application on page load
 */
async function initializeApp() {
    showLoadingState();
    setupEventListeners();
    await fetchAndPrepareUsers();
    applyFilters();
    updateVisibilityAndSort();
    hideLoadingState();
}

/**
 * Pick and highlight a random user from the filtered list
 */
function pickRandomUser() {
    const usersToPickFrom = filteredUsers.length > 0 ? filteredUsers : allUsers;
    if (usersToPickFrom.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'toast-notification';
        msg.textContent = '🎲 No developers found! Try adjusting your filters.';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
        return;
    }

    const filtersAside = document.getElementById('filtersAside');
    if (filtersAside && filtersAside.classList.contains('open')) {
        toggleFiltersPanel();
    }

    const randomIndex = Math.floor(Math.random() * usersToPickFrom.length);
    const randomUser = usersToPickFrom[randomIndex];

    if (!randomUser.card) {
        return;
    }

    randomUser.card.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        randomUser.card.classList.remove('highlight');
        void randomUser.card.offsetWidth;
        randomUser.card.classList.add('highlight');

        setTimeout(() => {
            randomUser.card.classList.remove('highlight');
        }, 3000);
    }, 500);
}

async function fetchAndPrepareUsers() {
    try {
        const res = await fetch('users.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch users.json: ${res.status}`);
        const users = await res.json();
        const prepared = users.map(prepareUserFromJson);
        allUsers = prepared;
        filteredUsers = [...allUsers];
        isDataLoaded = true;
        const total = allUsers.length;
        document.getElementById('totalCount').textContent = total.toLocaleString();
        document.getElementById('totalCountDesktop').textContent = total.toLocaleString();
    } catch (err) {
        console.error(err);
        const noResults = document.getElementById('noResults');
        const noResultsDesktop = document.getElementById('noResultsDesktop');
        if (noResults) {
            noResults.textContent = 'Unable to load users. Please try again later.';
            noResults.style.display = 'block';
        }
        if (noResultsDesktop) {
            noResultsDesktop.textContent = 'Unable to load users. Please try again later.';
            noResultsDesktop.style.display = 'block';
        }
    }
}

function prepareUserFromJson(user) {
    const getNum = (v, def = 0) => (v === 'N/A' || v == null ? def : parseInt(v, 10));
    const safeLower = v => (v ? String(v).toLowerCase() : '');
    const normalizeDate = v => (v ? new Date(v).toISOString() : '');
    const topLangs = Array.isArray(user.top_languages) ? user.top_languages : [];

    return {
        name: safeLower(user.name || user.login),
        login: safeLower(user.login),
        location: safeLower(user.location || ''),
        html_url: user.html_url,
        avatar_updated_at: normalizeDate(user.avatar_updated_at),
        last_repo_pushed_at: normalizeDate(user.last_repo_pushed_at),
        last_public_commit_at: normalizeDate(user.last_public_commit_at),
        followers: getNum(user.followers),
        following: getNum(user.following),
        repos: getNum(user.public_repos),
        gists: getNum(user.public_gists),
        forks: 0,
        sponsors: getNum(user.sponsors_count),
        sponsoring: getNum(user.sponsoring_count),
        total_stars: getNum(user.total_stars),
        top_languages: topLangs.map(l => ({
            name: safeLower(l.name),
            label: l.name,
            bytes: getNum(l.bytes),
            percent: l.percent
        })),
        followers_display: user.followers_display || formatDisplay(user.followers),
        following_display: user.following_display || formatDisplay(user.following),
        repos_display: user.repos_display || formatDisplay(user.public_repos),
        gists_display: user.gists_display || formatDisplay(user.public_gists),
        sponsors_display: user.sponsors_display || formatDisplay(user.sponsors_count),
        sponsoring_display: user.sponsoring_display || formatDisplay(user.sponsoring_count),
        stars_display: formatDisplay(user.total_stars),
        raw: user
    };
}

function formatDisplay(val) {
    if (val === 'N/A' || val == null) return 'N/A';
    const num = parseInt(val, 10);
    return Number.isNaN(num) ? String(val) : num.toLocaleString();
}

function formatDateDisplay(val) {
    if (!val) return 'N/A';
    const dt = new Date(val);
    if (Number.isNaN(dt.getTime())) return 'N/A';
    return dt.toISOString().split('T')[0];
}
/**
 * Extract location emoji and text from card
 * @param {HTMLElement} card - The card element
 * @returns {string} Location text in lowercase
 */
function extractLocation() { return ''; }

/**
 * Extract sponsors and sponsoring counts from stats
 * @param {HTMLElement} card - The card element
 * @returns {Object} Object with sponsors and sponsoring counts
 */
function extractStats() { return { sponsors: 0, sponsoring: 0 }; }


// ============================================================================
// EVENT LISTENER SETUP
// ============================================================================
/**
 * Setup all event listeners for filter controls
 */
function setupEventListeners() {
    const filterIds = [
        'searchInput', 'sortBy', 'followersFilter', 'maxFollowersFilter',
        'minReposFilter', 'maxReposFilter', 'minForksFilter', 'maxForksFilter',
        'sponsorsFilter', 'sponsoringFilter', 'avatarAgeFilter',
        'minStarsFilter', 'languageFilter', 'lastRepoActivityFilter', 'lastCommitFilter'
    ];

    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', onFilterChange);
            element.addEventListener('change', onFilterChange);
        }
    });

    const randomBtn = document.getElementById('randomUserBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', pickRandomUser);
    }
}

/**
 * Handle any filter change event
 */
function onFilterChange() {
    showLoadingState();
    applyFilters();
    updateVisibilityAndSort();
    hideLoadingState();
}

/**
 * Toggle the mobile filters panel
 */
function toggleFiltersPanel() {
    const filtersAside = document.getElementById('filtersAside');
    filtersAside.classList.toggle('open');
    document.body.classList.toggle('filters-open');
}

// ============================================================================
// FILTER LOGIC
// ============================================================================
/**
 * Apply all active filters to the user list
 */
function applyFilters() {
    const filters = getActiveFilters();
    validateRangeFilters(filters);
    const dateRanges = getDateRanges();

    filteredUsers = allUsers.filter(user => {
        return matchesAllFilters(user, filters, dateRanges);
    });
}

/**
 * Get all active filter values from DOM
 * @returns {Object} Active filter values
 */
function getActiveFilters() {
    return {
        searchTerm: document.getElementById('searchInput').value.toLowerCase(),
        minFollowers: parseInt(document.getElementById('followersFilter').value),
        maxFollowers: parseInt(document.getElementById('maxFollowersFilter').value),
        minRepos: parseInt(document.getElementById('minReposFilter').value),
        maxRepos: parseInt(document.getElementById('maxReposFilter').value),
        minForks: parseInt(document.getElementById('minForksFilter').value),
        maxForks: parseInt(document.getElementById('maxForksFilter').value),
        sponsorsFilter: document.getElementById('sponsorsFilter').value,
        sponsoringFilter: document.getElementById('sponsoringFilter').value,
        avatarAgeFilter: document.getElementById('avatarAgeFilter').value,
        minStars: parseInt(document.getElementById('minStarsFilter').value),
        languageFilter: document.getElementById('languageFilter').value.toLowerCase().trim(),
        lastRepoActivityFilter: document.getElementById('lastRepoActivityFilter').value,
        lastCommitFilter: document.getElementById('lastCommitFilter').value
    };
}

/**
 * Validate and fix inverted min/max filters
 * @param {Object} filters - The filters object
 */
function validateRangeFilters(filters) {
    if (filters.minFollowers > filters.maxFollowers) {
        document.getElementById('maxFollowersFilter').value = '999999999';
        filters.maxFollowers = 999999999;
    }
    if (filters.minRepos > filters.maxRepos) {
        document.getElementById('maxReposFilter').value = '999999';
        filters.maxRepos = 999999;
    }
    if (filters.minForks > filters.maxForks) {
        document.getElementById('maxForksFilter').value = '999999';
        filters.maxForks = 999999;
    }
}

/**
 * Get date range objects for avatar age filtering
 * @returns {Object} Date range objects
 */
function getDateRanges() {
    const now = new Date();
    return {
        oneWeekAgo: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        oneMonthAgo: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
        sixMonthsAgo: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
        oneYearAgo: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        twoYearsAgo: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
        fiveYearsAgo: new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
    };
}

/**
 * Check if a user matches all active filters
 * @param {Object} user - User object
 * @param {Object} filters - Active filters
 * @param {Object} dateRanges - Date range objects
 * @returns {boolean} True if user matches all filters
 */
function matchesAllFilters(user, filters, dateRanges) {
    return matchesSearch(user, filters.searchTerm) &&
        matchesFollowerRange(user, filters) &&
        matchesRepoRange(user, filters) &&
        matchesForkRange(user, filters) &&
        matchesPublicSponsors(user, filters.sponsorsFilter) &&
        matchesSponsoring(user, filters.sponsoringFilter) &&
        matchesAvatarAge(user, filters.avatarAgeFilter, dateRanges) &&
        matchesStars(user, filters.minStars) &&
        matchesLanguage(user, filters.languageFilter) &&
        matchesRepoActivity(user, filters.lastRepoActivityFilter, dateRanges) &&
        matchesCommitActivity(user, filters.lastCommitFilter, dateRanges);
}

/**
 * Check if user matches search term
 * @param {Object} user - User object
 * @param {string} searchTerm - Search term
 * @returns {boolean} True if matches
 */
function matchesSearch(user, searchTerm) {
    if (!searchTerm) return true;
    return user.name.includes(searchTerm) ||
        user.login.includes(searchTerm) ||
        user.location.includes(searchTerm);
}

/**
 * Check if user matches follower range
 * @param {Object} user - User object
 * @param {Object} filters - Filters object
 * @returns {boolean} True if within range
 */
function matchesFollowerRange(user, filters) {
    return user.followers >= filters.minFollowers && user.followers <= filters.maxFollowers;
}

/**
 * Check if user matches repository range
 * @param {Object} user - User object
 * @param {Object} filters - Filters object
 * @returns {boolean} True if within range
 */
function matchesRepoRange(user, filters) {
    return user.repos >= filters.minRepos && user.repos <= filters.maxRepos;
}

/**
 * Check if user matches forks range
 * @param {Object} user - User object
 * @param {Object} filters - Filters object
 * @returns {boolean} True if within range
 */
function matchesForkRange(user, filters) {
    return user.forks >= filters.minForks && user.forks <= filters.maxForks;
}

/**
 * Check if user matches sponsors filter
 * @param {Object} user - User object
 * @param {string} sponsorsFilter - Public Sponsors filter value
 * @returns {boolean} True if matches
 */
function matchesPublicSponsors(user, sponsorsFilter) {
    if (sponsorsFilter === 'any') return true;
    if (sponsorsFilter === 'has-sponsors') return user.sponsors > 0;
    if (sponsorsFilter.startsWith('min-')) {
        const minPublicSponsors = parseInt(sponsorsFilter.split('-')[1]);
        return user.sponsors >= minPublicSponsors;
    }
    return true;
}

/**
 * Check if user matches sponsoring filter
 * @param {Object} user - User object
 * @param {string} sponsoringFilter - Sponsoring filter value
 * @returns {boolean} True if matches
 */
function matchesSponsoring(user, sponsoringFilter) {
    if (sponsoringFilter === 'any') return true;
    if (sponsoringFilter === 'is-sponsoring') return user.sponsoring > 0;
    if (sponsoringFilter.startsWith('min-')) {
        const minSponsoring = parseInt(sponsoringFilter.split('-')[1]);
        return user.sponsoring >= minSponsoring;
    }
    return true;
}

/**
 * Check if user matches avatar age filter
 * @param {Object} user - User object
 * @param {string} ageFilter - Avatar age filter value
 * @param {Object} dateRanges - Date range objects
 * @returns {boolean} True if matches
 */
function matchesAvatarAge(user, ageFilter, dateRanges) {
    if (ageFilter === 'any' || !user.avatar_updated_at) return true;

    const avatarDate = new Date(user.avatar_updated_at);
    const ranges = {
        'week': avatarDate >= dateRanges.oneWeekAgo,
        'month': avatarDate >= dateRanges.oneMonthAgo,
        '6months': avatarDate >= dateRanges.sixMonthsAgo,
        'year': avatarDate >= dateRanges.oneYearAgo,
        '2years': avatarDate >= dateRanges.twoYearsAgo,
        '5years': avatarDate >= dateRanges.fiveYearsAgo,
        'old': avatarDate < dateRanges.fiveYearsAgo
    };

    return ranges[ageFilter] !== undefined ? ranges[ageFilter] : true;
}

function matchesStars(user, minStars) {
    return user.total_stars >= (Number.isNaN(minStars) ? 0 : minStars);
}

function matchesLanguage(user, languageFilter) {
    if (!languageFilter) return true;
    return user.top_languages.some(l => l.name.includes(languageFilter));
}

function matchesRepoActivity(user, activityFilter, dateRanges) {
    if (activityFilter === 'any' || !user.last_repo_pushed_at) return true;
    return matchesDateByRange(user.last_repo_pushed_at, activityFilter, dateRanges);
}

function matchesCommitActivity(user, commitFilter, dateRanges) {
    if (commitFilter === 'any' || !user.last_public_commit_at) return true;
    return matchesDateByRange(user.last_public_commit_at, commitFilter, dateRanges);
}

function matchesDateByRange(dateString, rangeKey, dateRanges) {
    const dt = new Date(dateString);
    const ranges = {
        'week': dt >= dateRanges.oneWeekAgo,
        'month': dt >= dateRanges.oneMonthAgo,
        '6months': dt >= dateRanges.sixMonthsAgo,
        'year': dt >= dateRanges.oneYearAgo,
        '2years': dt >= dateRanges.twoYearsAgo,
        '5years': dt >= dateRanges.fiveYearsAgo,
        'old': dt < dateRanges.fiveYearsAgo
    };
    return ranges[rangeKey] !== undefined ? ranges[rangeKey] : true;
}


// ============================================================================
// SORTING AND VISIBILITY
// ============================================================================
/**
 * Update visibility and sort the user cards
 */
function updateVisibilityAndSort() {
    const sortBy = document.getElementById('sortBy').value;
    const sortedUsers = getSortedUsers(sortBy);

    renderCards(sortedUsers);
    updateCounts(sortedUsers);
    updateResultsMessage(sortedUsers);
}

/**
 * Get sorted copy of filtered users
 * @param {string} sortBy - Sort option
 * @returns {Array} Sorted users array
 */
function getSortedUsers(sortBy) {
    const sorted = [...filteredUsers];

    const sorters = {
        'followers-desc': (a, b) => b.followers - a.followers,
        'followers-asc': (a, b) => a.followers - b.followers,
        'following-desc': (a, b) => b.following - a.following,
        'following-asc': (a, b) => a.following - b.following,
        'repos-desc': (a, b) => b.repos - a.repos,
        'repos-asc': (a, b) => a.repos - b.repos,
        'gists-desc': (a, b) => b.gists - a.gists,
        'gists-asc': (a, b) => a.gists - b.gists,
        'forks-desc': (a, b) => b.forks - a.forks,
        'forks-asc': (a, b) => a.forks - b.forks,
        'sponsors-desc': (a, b) => b.sponsors - a.sponsors,
        'sponsors-asc': (a, b) => a.sponsors - b.sponsors,
        'sponsoring-desc': (a, b) => b.sponsoring - a.sponsoring,
        'sponsoring-asc': (a, b) => a.sponsoring - b.sponsoring,
        'stars-desc': (a, b) => b.total_stars - a.total_stars,
        'stars-asc': (a, b) => a.total_stars - b.total_stars,
        'last-repo-desc': (a, b) => new Date(b.last_repo_pushed_at || 0) - new Date(a.last_repo_pushed_at || 0),
        'last-repo-asc': (a, b) => new Date(a.last_repo_pushed_at || 0) - new Date(b.last_repo_pushed_at || 0),
        'last-commit-desc': (a, b) => new Date(b.last_public_commit_at || 0) - new Date(a.last_public_commit_at || 0),
        'last-commit-asc': (a, b) => new Date(a.last_public_commit_at || 0) - new Date(b.last_public_commit_at || 0),
        'name-asc': (a, b) => a.name.localeCompare(b.name),
        'name-desc': (a, b) => b.name.localeCompare(a.name),
        'ratio-followers-following': (a, b) => {
            const ratioA = a.following > 0 ? a.followers / a.following : a.followers;
            const ratioB = b.following > 0 ? b.followers / b.following : b.followers;
            return ratioB - ratioA;
        }
    };

    if (sorters[sortBy]) {
        sorted.sort(sorters[sortBy]);
    }

    return sorted;
}

/**
 * Render cards in DOM with sorted order
 * @param {Array} sortedUsers - Sorted users array
 */
function renderCards(sortedUsers) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    sortedUsers.forEach(user => {
        const card = buildCardElement(user);
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

function buildCardElement(user) {
    const card = document.createElement('div');
    card.className = 'card visible';
    card.setAttribute('data-followers', user.followers);
    card.setAttribute('data-repos', user.repos);
    card.setAttribute('data-forks', user.forks);
    card.setAttribute('data-name', user.name);
    card.setAttribute('data-login', user.login);
    card.setAttribute('data-location', user.location);
    card.setAttribute('data-avatar-updated', user.avatar_updated_at || '');
    card.setAttribute('data-stars', user.total_stars || 0);

    const link = document.createElement('a');
    link.href = user.html_url;
    link.target = '_blank';
    link.rel = 'noopener';

    const img = document.createElement('img');
    img.src = `images/faces/${user.login}.png`;
    img.alt = user.login;
    img.title = user.login;
    img.loading = 'lazy';
    img.decoding = 'async';
    link.appendChild(img);

    const box = document.createElement('div');
    box.className = 'details-box';

    const strong = document.createElement('strong');
    strong.textContent = user.raw.name || user.raw.login;
    const atSpan = document.createElement('span');
    atSpan.textContent = `@${user.raw.login}`;

    box.appendChild(strong);
    box.appendChild(atSpan);

    box.appendChild(buildLabeledSpan('Followers:', user.raw.followers !== 'N/A', `${user.html_url}?tab=followers`, user.followers_display));
    box.appendChild(buildLabeledSpan('Following:', user.raw.following !== 'N/A', `${user.html_url}?tab=following`, user.following_display));

    if (user.raw.location) {
        const locSpan = document.createElement('span');
        locSpan.textContent = `🌐 ${user.raw.location}`;
        box.appendChild(locSpan);
    }

    const statsRow = document.createElement('div');
    statsRow.className = 'stats-row';
    statsRow.appendChild(buildStat(user.raw.public_repos !== 'N/A', `${user.html_url}?tab=repositories`, user.repos_display, 'Repos'));
    statsRow.appendChild(buildStat(user.raw.public_gists !== 'N/A', `https://gist.github.com/${user.raw.login}`, user.gists_display, 'Gists'));
    statsRow.appendChild(buildStat(user.raw.sponsors_count !== 'N/A', `${user.html_url}?tab=sponsors`, user.sponsors_display, 'Public Sponsors'));
    statsRow.appendChild(buildStat(user.raw.sponsoring_count !== 'N/A', `${user.html_url}?tab=sponsoring`, user.sponsoring_display, 'Public Sponsoring'));
    statsRow.appendChild(buildStat(true, `${user.html_url}?tab=repositories`, user.stars_display, 'Total Stars'));
    box.appendChild(statsRow);

    const activity = document.createElement('div');
    activity.className = 'activity-row';
    let commitText = `Last commit: ${formatDateDisplay(user.last_repo_pushed_at)}`;
    if (user.last_public_commit_at) commitText += `<br>Last public commit: ${formatDateDisplay(user.last_public_commit_at)}`;
    activity.innerHTML = commitText;

    box.appendChild(activity);

    if (user.top_languages.length) {
        const langRow = document.createElement('div');
        langRow.className = 'lang-row';
        user.top_languages.slice(0, 3).forEach(lang => {
            const pill = document.createElement('span');
            pill.className = 'lang-pill';
            pill.textContent = `${lang.label}${lang.percent ? ` (${lang.percent}%)` : ''}`;
            langRow.appendChild(pill);
        });
        box.appendChild(langRow);
    }

    card.appendChild(link);
    card.appendChild(box);
    return card;
}

function buildLabeledSpan(labelText, hasLink, href, valueText) {
    const span = document.createElement('span');
    const labelNode = document.createTextNode(`${labelText} `);
    span.appendChild(labelNode);
    if (hasLink) {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = valueText;
        span.appendChild(a);
    } else {
        span.appendChild(document.createTextNode(valueText));
    }
    return span;
}

function buildStat(hasLink, href, valueText, label) {
    const stat = document.createElement('div');
    stat.className = 'stat';
    if (hasLink) {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = valueText;
        stat.appendChild(a);
    } else {
        stat.appendChild(document.createTextNode(valueText));
    }
    const lbl = document.createElement('span');
    lbl.className = 'stat-label';
    lbl.textContent = label;
    stat.appendChild(lbl);
    return stat;
}

/**
 * Update visible and total counts
 * @param {Array} sortedUsers - Sorted users array
 */
function updateCounts(sortedUsers) {
    const visibleCount = sortedUsers.length;
    const totalCount = allUsers.length;

    document.getElementById('visibleCount').textContent = visibleCount.toLocaleString();
    document.getElementById('totalCount').textContent = totalCount.toLocaleString();

    document.getElementById('visibleCountDesktop').textContent = visibleCount.toLocaleString();
    document.getElementById('totalCountDesktop').textContent = totalCount.toLocaleString();
}

/**
 * Update results found/no results message
 * @param {Array} sortedUsers - Sorted users array
 */
function updateResultsMessage(sortedUsers) {
    const visibleCount = sortedUsers.length;
    const totalCount = allUsers.length;

    const resultsFound = document.getElementById('resultsFound');
    const noResults = document.getElementById('noResults');

    const resultsFoundDesktop = document.getElementById('resultsFoundDesktop');
    const noResultsDesktop = document.getElementById('noResultsDesktop');

    if (visibleCount === 0) {
        if (resultsFound) resultsFound.style.display = 'none';
        if (noResults) noResults.style.display = 'block';
        if (resultsFoundDesktop) resultsFoundDesktop.style.display = 'none';
        if (noResultsDesktop) noResultsDesktop.style.display = 'block';
    } else {
        if (resultsFound) resultsFound.style.display = 'block';
        if (noResults) noResults.style.display = 'none';
        if (resultsFoundDesktop) resultsFoundDesktop.style.display = 'block';
        if (noResultsDesktop) noResultsDesktop.style.display = 'none';
    }
}

// ============================================================================
// RESET FILTERS
// ============================================================================
/**
 * Reset all filters to default values
 */
function resetFilters() {
    const defaults = {
        searchInput: '',
        sortBy: 'followers-desc',
        followersFilter: '0',
        maxFollowersFilter: '999999999',
        minReposFilter: '0',
        maxReposFilter: '999999',
        minForksFilter: '0',
        maxForksFilter: '999999',
        sponsorsFilter: 'any',
        sponsoringFilter: 'any',
        avatarAgeFilter: 'any',
        minStarsFilter: '0',
        languageFilter: '',
        lastRepoActivityFilter: 'any',
        lastCommitFilter: 'any'
    };

    Object.entries(defaults).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    });

    applyFilters();
    updateVisibilityAndSort();
}

// ============================================================================
// LOADING STATE
// ============================================================================
/**
 * Show loading spinner
 */
function showLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const loadingStateDesktop = document.getElementById('loadingStateDesktop');
    const resultsInfo = document.getElementById('resultsInfo');
    const resultsInfoDesktop = document.getElementById('resultsInfoDesktop');

    [loadingState, loadingStateDesktop].forEach(el => el && (el.style.display = 'flex'));
    if (resultsInfo) resultsInfo.style.display = 'none';
    if (resultsInfoDesktop) resultsInfoDesktop.style.display = 'none';
}

/**
 * Hide loading spinner
 */
function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const loadingStateDesktop = document.getElementById('loadingStateDesktop');

    if (loadingState) loadingState.style.display = 'none';
    if (loadingStateDesktop) loadingStateDesktop.style.display = 'none';
}