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

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application on page load
 */
function initializeApp() {
    const cards = document.querySelectorAll('.card');
    showLoadingState();
    document.getElementById('totalCount').textContent = cards.length.toLocaleString();
    document.getElementById('totalCountDesktop').textContent = cards.length.toLocaleString();
    cards.forEach(card => allUsers.push(parseUserCard(card)));
    filteredUsers = [...allUsers];
    setupEventListeners();
    applyFilters();
    updateVisibilityAndSort();
    hideLoadingState();
}

/**
 * Parse user data from a card element
 * @param {HTMLElement} card - The card element to parse
 * @returns {Object} User object with extracted data
 */
function parseUserCard(card) {
    const name = card.querySelector('strong').textContent.toLowerCase();
    const login = card.querySelector('span:nth-of-type(2)').textContent.toLowerCase();
    const location = extractLocation(card);
    const languages = (card.querySelector('.languages')?.textContent || '').toLowerCase();
    const followers = parseInt(card.getAttribute('data-followers') || '0');
    const following = parseInt(card.getAttribute('data-following') || '0');
    const repos = parseInt(card.getAttribute('data-repos') || '0');
    const forks = parseInt(card.getAttribute('data-forks') || '0');
    const {
        sponsors,
        sponsoring
    } = extractStats(card);
    const avatarUpdated = card.getAttribute('data-avatar-updated') || '';

    return {
        card,
        name,
        login,
        location,
        languages,
        followers,
        following,
        repos,
        forks,
        sponsors,
        sponsoring,
        avatarUpdated
    };
}
/**
 * Extract location emoji and text from card
 * @param {HTMLElement} card - The card element
 * @returns {string} Location text in lowercase
 */
function extractLocation(card) {
    const spans = card.querySelectorAll('span');
    for (let span of spans) {
        if (span.textContent.includes('🌐')) {
            return span.textContent.toLowerCase();
        }
    }
    return '';
}

/**
 * Extract sponsors and sponsoring counts from stats
 * @param {HTMLElement} card - The card element
 * @returns {Object} Object with sponsors and sponsoring counts
 */
function extractStats(card) {
    let sponsors = 0;
    let sponsoring = 0;
    const statSpans = card.querySelectorAll('.stat a, .stat');

    statSpans.forEach(stat => {
        const label = stat.nextElementSibling;
        if (label && label.classList.contains('stat-label')) {
            const text = stat.textContent.trim();
            const value = text === 'N/A' ? 0 : parseInt(text.replace(/,/g, ''));

            if (label.textContent === 'Public Sponsors') sponsors = value;
            if (label.textContent === 'Public Sponsoring') sponsoring = value;
        }
    });

    return {
        sponsors,
        sponsoring
    };
}


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
        'sponsorsFilter', 'sponsoringFilter', 'avatarAgeFilter'
    ];

    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = id === 'searchInput' ? 'input' : 'change';
            element.addEventListener(eventType, onFilterChange);
        }
    });

    const randomUserBtn = document.getElementById('randomUserBtn');
    if (randomUserBtn) {
        randomUserBtn.addEventListener('click', pickRandomUser);
    }
}
function pickRandomUser() {
    const usersToPickFrom = filteredUsers.length > 0 ? filteredUsers : allUsers;

    if (usersToPickFrom.length === 0) {
        alert('No users found to pick from!');
        return;
    }

    const randomIndex = Math.floor(Math.random() * usersToPickFrom.length);
    const randomUser = usersToPickFrom[randomIndex];
    randomUser.card.classList.add('visible');
    randomUser.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    randomUser.card.classList.remove('highlight');
    void randomUser.card.offsetWidth; // Force reflow to re-trigger CSS animation
    randomUser.card.classList.add('highlight');
    setTimeout(() => {
        randomUser.card.classList.remove('highlight');
    }, 2000);
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
        avatarAgeFilter: document.getElementById('avatarAgeFilter').value
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
        matchesAvatarAge(user, filters.avatarAgeFilter, dateRanges);
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
        user.location.includes(searchTerm) ||
        user.languages.includes(searchTerm);
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
    if (ageFilter === 'any' || !user.avatarUpdated) return true;

    const avatarDate = new Date(user.avatarUpdated);
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
        'forks-desc': (a, b) => b.forks - a.forks,
        'forks-asc': (a, b) => a.forks - b.forks,
        'sponsors-desc': (a, b) => b.sponsors - a.sponsors,
        'sponsors-asc': (a, b) => a.sponsors - b.sponsors,
        'sponsoring-desc': (a, b) => b.sponsoring - a.sponsoring,
        'sponsoring-asc': (a, b) => a.sponsoring - b.sponsoring,
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
    allUsers.forEach(user => user.card.classList.remove('visible'));
    sortedUsers.forEach(user => {
        user.card.classList.add('visible');
        grid.appendChild(user.card);
    });
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
    } else if (visibleCount === totalCount) {
        if (resultsFound) resultsFound.style.display = 'none';
        if (noResults) noResults.style.display = 'none';
        if (resultsFoundDesktop) resultsFoundDesktop.style.display = 'none';
        if (noResultsDesktop) noResultsDesktop.style.display = 'none';
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
        avatarAgeFilter: 'any'
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

    if (loadingState) loadingState.style.display = 'block';
    if (loadingStateDesktop) loadingStateDesktop.style.display = 'block';
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
