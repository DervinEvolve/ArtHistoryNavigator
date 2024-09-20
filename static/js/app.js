let isLoading = false;
let hasMoreResults = true;
let currentQuery = '';
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    const searchResults = document.getElementById('search-results');
    const modal = document.getElementById('modal');
    const closeModal = document.getElementById('close-modal');
    const loadingIndicator = document.getElementById('loading-indicator');
    const backToTopButton = document.getElementById('back-to-top');

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

    window.addEventListener('scroll', () => {
        if (isLoading || !hasMoreResults) return;
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            fetchSearchResults(currentQuery, currentPage + 1);
        }

        if (window.scrollY > 300) {
            backToTopButton.classList.remove('hidden');
        } else {
            backToTopButton.classList.add('hidden');
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

async function fetchSearchResults(query, page = 1) {
    console.log('fetchSearchResults called with query:', query, 'page:', page);
    if (isLoading || !hasMoreResults) {
        console.log('Skipping fetch: isLoading =', isLoading, 'hasMoreResults =', hasMoreResults);
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

        if (data.results && Object.keys(data.results).some(key => data.results[key].length > 0)) {
            console.log('Results found, updating sections');
            updateResultSections(data.results);
            hasMoreResults = page < data.total_pages;
            currentPage = page;
        } else {
            console.log('No results found');
            showNoResultsMessage();
        }
    } catch (error) {
        console.error('Error fetching search results:', error);
        showErrorMessage(error.message);
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

function updateResultSections(results) {
    console.log('Updating result sections with:', results);
    const searchResults = document.getElementById('search-results');
    Object.entries(results).forEach(([source, items]) => {
        items.forEach(item => {
            const resultHtml = createResultHTML(item, source);
            console.log('Generated HTML for result:', resultHtml);
            searchResults.insertAdjacentHTML('beforeend', resultHtml);
        });
    });
}

function createResultHTML(result, source) {
    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    };

    let cardContent = '';
    let modalContent = '';

    switch (source) {
        case 'wikipedia':
        case 'internet_archive':
            cardContent = `
                <h3>${result.title}</h3>
                <p>${truncateText(result.snippet || result.description || '', 100)}</p>
            `;
            modalContent = JSON.stringify({
                title: result.title,
                content: result.snippet || result.description,
                url: source === 'wikipedia' ? `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}` : `https://archive.org/details/${result.identifier}`
            });
            break;
        case 'met_museum':
            cardContent = `
                <img src="${result.primaryImageSmall}" alt="${result.title}" class="lazy-load" data-src="${result.primaryImageSmall}">
                <h3>${result.title}</h3>
                <p>${truncateText(result.artistDisplayName, 50)}</p>
            `;
            modalContent = JSON.stringify(result);
            break;
    }

    return `
        <div class="search-result-card fade-in">
            ${cardContent}
            <button class="read-more-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200" data-source="${source}" data-content='${modalContent}'>Read More</button>
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
                <p>${content.content}</p>
                <a href="${content.url}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">Read full article on Wikipedia</a>
            `;
            break;
        case 'internet_archive':
            htmlContent = `
                <h2 class="text-2xl font-bold mb-4">${content.title}</h2>
                <p>${content.content}</p>
                <a href="${content.url}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Internet Archive</a>
            `;
            break;
        case 'met_museum':
            htmlContent = `
                <h2 class="text-2xl font-bold mb-4">${content.title}</h2>
                <img src="${content.primaryImage}" alt="${content.title}" class="w-full max-h-96 object-contain mb-4">
                <p><strong>Artist:</strong> ${content.artistDisplayName || 'Unknown'}</p>
                <p><strong>Date:</strong> ${content.objectDate || 'N/A'}</p>
                <p><strong>Medium:</strong> ${content.medium || 'N/A'}</p>
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
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '<p class="text-center text-gray-600">No results found. Please try a different search term.</p>';
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

document.addEventListener('DOMContentLoaded', lazyLoadImages);
window.addEventListener('load', lazyLoadImages);
