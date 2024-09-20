let isLoading = false;
let hasMoreResults = true;
let currentQuery = '';
let currentPage = 1;
let totalResults = 0;
let remainingResults = 0;
let visibleSources = ['wikipedia', 'internet_archive', 'met_museum'];

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
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
            console.log('Closing modal');
            modal.classList.add('hidden');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            console.log('Closing modal (clicked outside)');
            modal.classList.add('hidden');
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('read-more-btn')) {
            console.log('Read More button clicked');
            const source = e.target.dataset.source;
            const content = e.target.dataset.content;
            showModal(source, content);
        }
    });

    const loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'load-more-button';
    loadMoreButton.textContent = 'Load More';
    loadMoreButton.classList.add('bg-blue-500', 'text-white', 'px-4', 'py-2', 'rounded', 'mt-4', 'hidden');
    loadMoreButton.addEventListener('click', () => {
        console.log('Load More button clicked');
        fetchSearchResults(currentQuery, currentPage + 1);
    });
    searchResults.after(loadMoreButton);

    backToTopButton.addEventListener('click', () => {
        console.log('Back to Top button clicked');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Filter button clicked');
            const source = button.dataset.source;
            button.classList.toggle('bg-blue-500');
            button.classList.toggle('bg-gray-300');
            
            if (visibleSources.includes(source)) {
                visibleSources = visibleSources.filter(s => s !== source);
            } else {
                visibleSources.push(source);
            }
            
            console.log('Visible sources after filter:', visibleSources);
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
            console.log(`Adding results for ${source}`);
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
        } else {
            console.log(`No results for ${source}`);
        }
    });

    if (!resultsAdded && page === 1) {
        console.log('No results found');
        showNoResultsMessage();
    } else {
        hideNoResultsMessage();
    }

    filterResults();
}

function updateLoadMoreButton() {
    console.log('Updating Load More button');
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
    console.log('Creating result HTML for:', result, 'Source:', source);
    
    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    };

    let cardContent = '';
    let modalContent = '';
    let iconClass = '';

    switch (source) {
        case 'wikipedia':
            iconClass = 'wikipedia-icon';
            cardContent = `
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.snippet || '', 150)}</p>
            `;
            break;
        case 'internet_archive':
            iconClass = 'internet-archive-icon';
            cardContent = `
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.description || '', 150)}</p>
            `;
            break;
        case 'met_museum':
            iconClass = 'met-museum-icon';
            cardContent = `
                <img src="${result.primaryImageSmall}" alt="${result.title}" class="w-full h-48 object-cover mb-2 lazy-load" data-src="${result.primaryImageSmall}">
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.artistDisplayName || '', 50)}</p>
            `;
            break;
    }

    console.log('Generated cardContent:', cardContent);

    try {
        modalContent = JSON.stringify(result, (key, value) => {
            if (typeof value === 'string') {
                return value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            }
            return value;
        });
    } catch (error) {
        console.error('Error stringifying result:', error);
        modalContent = JSON.stringify({ error: 'Unable to display full content' });
    }

    console.log('Generated modalContent:', modalContent);

    const buttonHtml = `<button class="read-more-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200 mt-auto" data-source="${source}" data-content='${modalContent}'>Read More</button>`;

    const cardHtml = `
        <div class="search-result-card bg-white rounded-lg shadow-md overflow-hidden fade-in" data-source="${source}">
            <div class="flex items-center mb-2">
                <span class="icon ${iconClass} mr-2"></span>
                <h3 class="text-lg font-semibold">${result.title || 'No title'}</h3>
            </div>
            ${cardContent}
            ${buttonHtml}
        </div>
    `;

    console.log('Final cardHtml:', cardHtml);

    if (!cardHtml.includes('read-more-btn')) {
        console.error('Read More button is missing from the card HTML');
    }

    return cardHtml;
}

function showModal(source, content) {
    console.log('Showing modal for source:', source);
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    let htmlContent = '';
    try {
        const parsedContent = JSON.parse(content);
        switch (source) {
            case 'wikipedia':
                htmlContent = `
                    <h2 class="text-2xl font-bold mb-4">${parsedContent.title}</h2>
                    <p class="mb-4">${parsedContent.snippet || ''}</p>
                    <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(parsedContent.title)}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">Read full article on Wikipedia</a>
                `;
                break;
            case 'internet_archive':
                htmlContent = `
                    <h2 class="text-2xl font-bold mb-4">${parsedContent.title}</h2>
                    <p class="mb-4">${parsedContent.description || ''}</p>
                    <a href="https://archive.org/details/${parsedContent.identifier}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Internet Archive</a>
                `;
                break;
            case 'met_museum':
                htmlContent = `
                    <h2 class="text-2xl font-bold mb-4">${parsedContent.title}</h2>
                    <img src="${parsedContent.primaryImage}" alt="${parsedContent.title}" class="w-full max-h-96 object-contain mb-4">
                    <p class="mb-2"><strong>Artist:</strong> ${parsedContent.artistDisplayName || 'Unknown'}</p>
                    <p class="mb-2"><strong>Date:</strong> ${parsedContent.objectDate || 'N/A'}</p>
                    <p class="mb-4"><strong>Medium:</strong> ${parsedContent.medium || 'N/A'}</p>
                    <a href="${parsedContent.objectURL}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Met Museum Website</a>
                `;
                break;
            default:
                htmlContent = '<p>Error displaying content. Please try again.</p>';
        }
    } catch (error) {
        console.error('Error parsing modal content:', error);
        htmlContent = '<p>Error displaying content. Please try again.</p>';
    }

    modalContent.innerHTML = htmlContent;
    modal.classList.remove('hidden');
}

function showLoadingIndicator() {
    console.log('Showing loading indicator');
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.remove('hidden');
}

function hideLoadingIndicator() {
    console.log('Hiding loading indicator');
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.add('hidden');
}

function showNoResultsMessage() {
    console.log('Showing no results message');
    const noResults = document.getElementById('no-results');
    noResults.classList.remove('hidden');
}

function hideNoResultsMessage() {
    console.log('Hiding no results message');
    const noResults = document.getElementById('no-results');
    noResults.classList.add('hidden');
}

function showErrorMessage(message) {
    console.log('Showing error message:', message);
    const searchResults = document.getElementById('search-results');
    const errorMessage = document.createElement('p');
    errorMessage.textContent = `An error occurred: ${message}. Please try again later.`;
    errorMessage.classList.add('text-red-600', 'font-semibold', 'mt-4');
    searchResults.appendChild(errorMessage);
}

function addToSearchHistory(query) {
    console.log('Adding to search history:', query);
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
    console.log('Lazy loading images');
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
    console.log('Filtering results');
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

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        const source = button.dataset.source;
        if (visibleSources.includes(source)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', lazyLoadImages);
window.addEventListener('load', lazyLoadImages);