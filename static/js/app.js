let isLoading = false;
let hasMoreResults = true;
let currentQuery = '';
let currentPage = 1;
let totalResults = 0;
let remainingResults = 0;
let visibleSources = ['wikipedia', 'internet_archive', 'met_museum', 'rijksmuseum', 'harvard_art_museums', 'cooper_hewitt', 'perplexity'];

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    const searchResults = document.getElementById('search-results');
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

    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('read-more-btn')) {
            console.log('Read More button clicked');
            e.preventDefault();
            const card = e.target.closest('.search-result-card');
            showFloatingCard(card);
        } else if (e.target && e.target.classList.contains('add-to-collection-btn')) {
            console.log('Add to Collection button clicked');
            e.preventDefault();
            const source = e.target.dataset.source;
            const content = e.target.dataset.content;
            showCollectionsModal(source, content);
        } else if (e.target.classList.contains('close-floating-card')) {
            e.preventDefault();
            const floatingCard = document.querySelector('.floating-card');
            if (floatingCard) {
                floatingCard.remove();
                document.body.style.overflow = '';
            }
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

    const sources = ['wikipedia', 'internet_archive', 'met_museum', 'rijksmuseum', 'harvard_art_museums', 'cooper_hewitt', 'perplexity'];
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
    let expandedContent = '';
    let iconClass = '';

    switch (source) {
        case 'wikipedia':
            iconClass = 'wikipedia-icon';
            cardContent = `
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.snippet || '', 150)}</p>
            `;
            expandedContent = `
                <p>${result.snippet || ''}</p>
                <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">Read full article on Wikipedia</a>
            `;
            break;
        case 'internet_archive':
            iconClass = 'internet-archive-icon';
            cardContent = `
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.description || '', 150)}</p>
            `;
            expandedContent = `
                <p>${result.description || ''}</p>
                <a href="https://archive.org/details/${result.identifier}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Internet Archive</a>
            `;
            break;
        case 'met_museum':
            iconClass = 'met-museum-icon';
            cardContent = `
                <img src="${result.primaryImageSmall}" alt="${result.title}" class="w-full h-48 object-cover mb-2 lazy-load" data-src="${result.primaryImageSmall}">
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.artistDisplayName || '', 50)}</p>
            `;
            expandedContent = `
                <img src="${result.primaryImage}" alt="${result.title}" class="w-full max-h-96 object-contain mb-4">
                <p class="mb-2"><strong>Artist:</strong> ${result.artistDisplayName || 'Unknown'}</p>
                <p class="mb-2"><strong>Date:</strong> ${result.objectDate || 'N/A'}</p>
                <p class="mb-4"><strong>Medium:</strong> ${result.medium || 'N/A'}</p>
                <a href="${result.objectURL}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Met Museum Website</a>
            `;
            break;
        case 'rijksmuseum':
            iconClass = 'rijksmuseum-icon';
            cardContent = `
                <img src="${result.webImage.url}" alt="${result.title}" class="w-full h-48 object-cover mb-2 lazy-load" data-src="${result.webImage.url}">
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.principalOrFirstMaker || '', 50)}</p>
            `;
            expandedContent = `
                <img src="${result.webImage.url}" alt="${result.title}" class="w-full max-h-96 object-contain mb-4">
                <p class="mb-2"><strong>Artist:</strong> ${result.principalOrFirstMaker || 'Unknown'}</p>
                <p class="mb-2"><strong>Date:</strong> ${result.dating.presentingDate || 'N/A'}</p>
                <p class="mb-4"><strong>Medium:</strong> ${result.materials.join(', ') || 'N/A'}</p>
                <a href="${result.links.web}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Rijksmuseum Website</a>
            `;
            break;
        case 'harvard_art_museums':
            iconClass = 'harvard-art-museums-icon';
            cardContent = `
                <img src="${result.primaryimageurl}" alt="${result.title}" class="w-full h-48 object-cover mb-2 lazy-load" data-src="${result.primaryimageurl}">
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.people ? result.people[0].name : '', 50)}</p>
            `;
            expandedContent = `
                <img src="${result.primaryimageurl}" alt="${result.title}" class="w-full max-h-96 object-contain mb-4">
                <p class="mb-2"><strong>Artist:</strong> ${result.people ? result.people[0].name : 'Unknown'}</p>
                <p class="mb-2"><strong>Date:</strong> ${result.dated || 'N/A'}</p>
                <p class="mb-4"><strong>Medium:</strong> ${result.medium || 'N/A'}</p>
                <a href="${result.url}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Harvard Art Museums Website</a>
            `;
            break;
        case 'cooper_hewitt':
            iconClass = 'cooper-hewitt-icon';
            cardContent = `
                <img src="${result.images[0].b.url}" alt="${result.title}" class="w-full h-48 object-cover mb-2 lazy-load" data-src="${result.images[0].b.url}">
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.department_name || '', 50)}</p>
            `;
            expandedContent = `
                <img src="${result.images[0].b.url}" alt="${result.title}" class="w-full max-h-96 object-contain mb-4">
                <p class="mb-2"><strong>Department:</strong> ${result.department_name || 'N/A'}</p>
                <p class="mb-2"><strong>Date:</strong> ${result.date || 'N/A'}</p>
                <p class="mb-4"><strong>Medium:</strong> ${result.medium || 'N/A'}</p>
                <a href="${result.url}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Cooper Hewitt Website</a>
            `;
            break;
        case 'perplexity':
            iconClass = 'perplexity-icon';
            cardContent = `
                <p class="text-sm text-gray-600 mb-4">${truncateText(result.content || '', 150)}</p>
            `;
            expandedContent = `
                <p>${result.content || 'No content available'}</p>
            `;
            break;
    }

    console.log('Generated cardContent:', cardContent);
    console.log('Generated expandedContent:', expandedContent);

    const modalContent = JSON.stringify(result);

    const cardHtml = `
        <div class="search-result-card bg-white rounded-lg shadow-md overflow-hidden fade-in" data-source="${source}">
            <div class="flex items-center mb-2">
                <span class="icon ${iconClass} mr-2"></span>
                <h3 class="text-lg font-semibold">${result.title || 'No title'}</h3>
            </div>
            ${cardContent}
            <div class="expanded-content hidden">${expandedContent}</div>
            <div class="flex justify-between mt-4">
                <button class="read-more-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200">Read More</button>
                <button class="add-to-collection-btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors duration-200" data-source="${source}" data-content='${modalContent}'>Add to Collection</button>
            </div>
        </div>
    `;

    console.log('Final cardHtml:', cardHtml);

    return cardHtml;
}

function showFloatingCard(card) {
    const existingFloatingCard = document.querySelector('.floating-card');
    if (existingFloatingCard) {
        existingFloatingCard.remove();
    }

    const expandedContent = card.querySelector('.expanded-content').innerHTML;
    const floatingCard = document.createElement('div');
    floatingCard.className = 'floating-card fixed inset-0 flex items-center justify-center bg-black bg-opacity-50';
    floatingCard.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
            ${expandedContent}
            <button class="close-floating-card absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;
    document.body.appendChild(floatingCard);
    document.body.style.overflow = 'hidden';

    floatingCard.querySelector('.close-floating-card').addEventListener('click', function() {
        floatingCard.remove();
        document.body.style.overflow = '';
    });
}

function showCollectionsModal(source, content) {
    console.log('Showing collections modal for source:', source);
    const modal = document.getElementById('collections-modal');
    const collectionsList = document.getElementById('collections-list');

    fetch('/api/collections')
        .then(response => response.json())
        .then(collections => {
            collectionsList.innerHTML = collections.map(collection => `
                <div class="mb-2">
                    <button class="add-to-collection px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" data-collection-id="${collection.id}" data-source="${source}" data-content='${content}'>
                        ${collection.title}
                    </button>
                </div>
            `).join('');
        });

    modal.classList.remove('hidden');
}

document.getElementById('close-collections-modal').addEventListener('click', function() {
    document.getElementById('collections-modal').classList.add('hidden');
});

document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('add-to-collection')) {
        const collectionId = e.target.dataset.collectionId;
        const source = e.target.dataset.source;
        const content = e.target.dataset.content;

        fetch(`/add_to_collection/${collectionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ source: source, content: content }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                document.getElementById('collections-modal').classList.add('hidden');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});

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