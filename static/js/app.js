let isLoading = false;
let hasMoreResults = true;
let currentQuery = '';
let currentPage = 1;
let totalResults = 0;
let remainingResults = 0;
let visibleSources = ['wikipedia', 'internet_archive', 'met_museum'];

document.addEventListener('DOMContentLoaded', () => {
    const searchResults = document.getElementById('search-results');
    const modal = document.getElementById('modal');
    const closeModal = document.getElementById('close-modal');
    const loadingIndicator = document.getElementById('loading-indicator');
    const backToTopButton = document.getElementById('back-to-top');
    const filterButtons = document.querySelectorAll('.filter-btn');

    if (searchResults) {
        const query = new URLSearchParams(window.location.search).get('q');
        if (query) {
            console.log('Initial search query:', query);
            currentQuery = query;
            fetchSearchResults(query);
            addToSearchHistory(query);
        } else {
            console.log('No search query found');
        }
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('read-more-btn')) {
            const source = e.target.dataset.source;
            const content = JSON.parse(e.target.dataset.content);
            showModal(source, content);
        }
    });

    const loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'load-more-button';
    loadMoreButton.textContent = 'Load More';
    loadMoreButton.classList.add('bg-blue-500', 'text-white', 'px-4', 'py-2', 'rounded', 'mt-4', 'hidden');
    loadMoreButton.addEventListener('click', () => {
        fetchSearchResults(currentQuery, currentPage + 1);
    });
    searchResults.after(loadMoreButton);

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const source = button.dataset.source;
            button.classList.toggle('bg-blue-500');
            button.classList.toggle('bg-gray-300');
            
            if (visibleSources.includes(source)) {
                visibleSources = visibleSources.filter(s => s !== source);
            } else {
                visibleSources.push(source);
            }
            
            filterResults();
        });
    });
});

async function fetchSearchResults(query, page = 1) {
    console.log('fetchSearchResults called with query:', query, 'page:', page);
    if (isLoading) {
        console.log('Already loading, skipping fetch');
        return;
    }
    isLoading = true;
    showLoadingIndicator();

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
        console.log('API response status:', response.status);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        console.log('API response data:', data);

        updateResultSections(data.results, page);
        hasMoreResults = page < data.total_pages;
        currentPage = page;
        totalResults = data.total_results;
        remainingResults = totalResults - (currentPage * Object.values(data.results).flat().length);
        updateLoadMoreButton();
    } catch (error) {
        console.error('Error fetching search results:', error);
        showErrorMessage(error.message);
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

function updateResultSections(results, page) {
    console.log('Updating result sections with:', results);
    const searchResults = document.getElementById('search-results');
    let resultsAdded = false;

    if (page === 1) {
        searchResults.innerHTML = '';
    }

    const sources = ['wikipedia', 'internet_archive', 'met_museum'];
    sources.forEach(source => {
        if (results[source] && results[source].length > 0) {
            const sourceHeader = document.createElement('h2');
            sourceHeader.textContent = `${source.replace('_', ' ').charAt(0).toUpperCase() + source.replace('_', ' ').slice(1)}`;
            sourceHeader.classList.add('text-2xl', 'font-bold', 'mt-8', 'mb-4');
            sourceHeader.dataset.source = source;
            searchResults.appendChild(sourceHeader);

            const sourceResults = document.createElement('div');
            sourceResults.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
            sourceResults.dataset.source = source;
            
            results[source].slice(0, 10).forEach(item => {
                const resultHtml = createResultHTML(item, source);
                sourceResults.insertAdjacentHTML('beforeend', resultHtml);
                resultsAdded = true;
            });

            searchResults.appendChild(sourceResults);
        }
    });

    if (!resultsAdded && page === 1) {
        showNoResultsMessage();
    } else {
        hideNoResultsMessage();
    }

    filterResults();
}

function updateLoadMoreButton() {
    const loadMoreButton = document.getElementById('load-more-button');
    if (hasMoreResults) {
        loadMoreButton.textContent = `Load More (${remainingResults} results remaining)`;
        loadMoreButton.classList.remove('hidden');
        loadMoreButton.disabled = false;
    } else {
        loadMoreButton.classList.add('hidden');
        loadMoreButton.disabled = true;
    }
}

function createResultHTML(result, source) {
    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    };

    let cardContent = '';
    let modalContent = '';
    let icon = '';

    switch (source) {
        case 'wikipedia':
            icon = '<span class="icon wikipedia-icon mr-2"></span>';
            cardContent = `
                <h3 class="text-lg font-semibold mb-2 flex items-center">${icon}${result.title}</h3>
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.snippet || '', 100)}</p>
            `;
            modalContent = JSON.stringify({
                title: result.title,
                content: result.snippet,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`
            });
            break;
        case 'internet_archive':
            icon = '<span class="icon internet-archive-icon mr-2"></span>';
            cardContent = `
                <h3 class="text-lg font-semibold mb-2 flex items-center">${icon}${result.title}</h3>
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.description || '', 100)}</p>
            `;
            modalContent = JSON.stringify({
                title: result.title,
                content: result.description,
                url: `https://archive.org/details/${result.identifier}`
            });
            break;
        case 'met_museum':
            icon = '<span class="icon met-museum-icon mr-2"></span>';
            cardContent = `
                <img src="${result.primaryImageSmall}" alt="${result.title}" class="w-full h-48 object-cover mb-2 lazy-load" data-src="${result.primaryImageSmall}">
                <h3 class="text-lg font-semibold mb-2 flex items-center">${icon}${result.title}</h3>
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.artistDisplayName, 50)}</p>
            `;
            modalContent = JSON.stringify(result);
            break;
    }

    return `
        <div class="search-result-card bg-white rounded-lg shadow-md overflow-hidden fade-in" data-source="${source}">
            ${cardContent}
            <button class="read-more-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200 w-full" data-source="${source}" data-content='${modalContent}'>Read More</button>
        </div>
    `;
}

function showModal(source, content) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    let htmlContent = '';
    switch (source) {
        case 'wikipedia':
            htmlContent = `
                <h2 class="text-2xl font-bold mb-4">${content.title}</h2>
                <p class="mb-4">${content.content}</p>
                <a href="${content.url}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">Read full article on Wikipedia</a>
            `;
            break;
        case 'internet_archive':
            htmlContent = `
                <h2 class="text-2xl font-bold mb-4">${content.title}</h2>
                <p class="mb-4">${content.content}</p>
                <a href="${content.url}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Internet Archive</a>
            `;
            break;
        case 'met_museum':
            htmlContent = `
                <h2 class="text-2xl font-bold mb-4">${content.title}</h2>
                <img src="${content.primaryImage}" alt="${content.title}" class="w-full max-h-96 object-contain mb-4">
                <p class="mb-2"><strong>Artist:</strong> ${content.artistDisplayName || 'Unknown'}</p>
                <p class="mb-2"><strong>Date:</strong> ${content.objectDate || 'N/A'}</p>
                <p class="mb-4"><strong>Medium:</strong> ${content.medium || 'N/A'}</p>
                <a href="${content.objectURL}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Met Museum Website</a>
            `;
            break;
    }

    modalContent.innerHTML = htmlContent;
    modal.classList.remove('hidden');
}

function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.remove('hidden');
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.add('hidden');
}

function showNoResultsMessage() {
    const noResults = document.getElementById('no-results');
    noResults.classList.remove('hidden');
}

function hideNoResultsMessage() {
    const noResults = document.getElementById('no-results');
    noResults.classList.add('hidden');
}

function showErrorMessage(message) {
    const searchResults = document.getElementById('search-results');
    const errorMessage = document.createElement('p');
    errorMessage.textContent = `An error occurred: ${message}. Please try again later.`;
    errorMessage.classList.add('text-red-600', 'font-semibold', 'mt-4');
    searchResults.appendChild(errorMessage);
}

function addToSearchHistory(query) {
    const searchHistoryList = document.getElementById('search-history');
    if (searchHistoryList) {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `/search?q=${encodeURIComponent(query)}`;
        link.textContent = query;
        listItem.appendChild(link);
        searchHistoryList.prepend(listItem);

        while (searchHistoryList.children.length > 5) {
            searchHistoryList.removeChild(searchHistoryList.lastChild);
        }
    }
}

function lazyLoadImages() {
    const images = document.querySelectorAll('img.lazy-load');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const image = entry.target;
                image.src = image.getAttribute('data-src');
                image.classList.remove('lazy-load');
                observer.unobserve(image);
            }
        });
    });

    images.forEach(image => {
        imageObserver.observe(image);
    });
}

function filterResults() {
    const searchResults = document.getElementById('search-results');
    const resultCards = searchResults.querySelectorAll('.search-result-card');
    const headers = searchResults.querySelectorAll('h2[data-source]');

    resultCards.forEach(card => {
        const source = card.dataset.source;
        if (visibleSources.includes(source)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    headers.forEach(header => {
        const source = header.dataset.source;
        if (visibleSources.includes(source)) {
            header.classList.remove('hidden');
        } else {
            header.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', lazyLoadImages);
window.addEventListener('load', lazyLoadImages);
