document.addEventListener('DOMContentLoaded', () => {
    const searchResults = document.getElementById('search-results');
    const detailsContainer = document.getElementById('details-container');
    const modal = document.getElementById('modal');
    const closeModal = document.getElementById('close-modal');
    const paginationContainer = document.getElementById('pagination');
    const searchHistoryList = document.getElementById('search-history');

    if (searchResults) {
        const query = new URLSearchParams(window.location.search).get('q');
        if (query) {
            fetchSearchResults(query);
            addToSearchHistory(query);
        }
    }

    if (detailsContainer) {
        const source = window.location.pathname.split('/')[2];
        const id = window.location.pathname.split('/')[3];
        fetchDetails(source, id);
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // Close modal when clicking outside the content
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Event listener for Read more buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('read-more-btn')) {
            const source = e.target.dataset.source;
            const content = JSON.parse(e.target.dataset.content);
            showModal(source, content);
        }
    });
});

async function fetchSearchResults(query, page = 1) {
    const wikipediaResults = document.querySelector('#wikipedia-results ul');
    const internetArchiveResults = document.querySelector('#internet-archive-results ul');
    const metMuseumResults = document.querySelector('#met-museum-results ul');
    const noResultsMessage = document.getElementById('no-results');
    const searchResults = document.getElementById('search-results');
    const paginationContainer = document.getElementById('pagination');

    const loadingIndicators = document.querySelectorAll('.loading');
    loadingIndicators.forEach(indicator => {
        indicator.classList.remove('hidden');
        indicator.innerHTML = '<p class="text-center">Loading...</p>';
    });

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const hasWikipediaResults = updateResultSection(wikipediaResults, data.results.wikipedia, 'wikipedia');
        const hasInternetArchiveResults = updateResultSection(internetArchiveResults, data.results.internet_archive, 'internet_archive');
        const hasMetMuseumResults = updateResultSection(metMuseumResults, data.results.met_museum, 'met_museum');

        if (!hasWikipediaResults && !hasInternetArchiveResults && !hasMetMuseumResults) {
            noResultsMessage.classList.remove('hidden');
            searchResults.classList.add('hidden');
            paginationContainer.classList.add('hidden');
        } else {
            noResultsMessage.classList.add('hidden');
            searchResults.classList.remove('hidden');
            updatePagination(data.current_page, data.total_pages, query);
        }
    } catch (error) {
        console.error('Error fetching search results:', error);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'An error occurred while fetching search results. Please try again later.';
        errorMessage.classList.add('text-red-600', 'font-semibold', 'mt-4');
        searchResults.prepend(errorMessage);
    } finally {
        loadingIndicators.forEach(indicator => indicator.classList.add('hidden'));
    }
}

function updateResultSection(container, results, source) {
    container.innerHTML = '';
    if (results.length === 0) {
        container.innerHTML = '<p class="text-gray-600">No results found</p>';
        return false;
    }
    const resultsHTML = results.map(result => createResultHTML(result, source)).join('');
    container.innerHTML = resultsHTML;
    return true;
}

function createResultHTML(result, source) {
    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    };

    return `
        <div class="search-result-card slide-in">
            ${result.primaryImageSmall ? `<img src="${result.primaryImageSmall}" alt="${result.title}" class="lazy-load" data-src="${result.primaryImageSmall}">` : ''}
            <h3>${result.title}</h3>
            <p>${truncateText(result.snippet || result.description || '', 100)}</p>
            <button class="read-more-btn" data-source="${source}" data-content='${JSON.stringify(result)}'>Read More</button>
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
                <p>${content.snippet}</p>
                <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(content.title)}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">Read full article on Wikipedia</a>
            `;
            break;
        case 'internet_archive':
            htmlContent = `
                <h2 class="text-2xl font-bold mb-4">${content.title}</h2>
                <p>${content.description || 'No description available'}</p>
                <a href="https://archive.org/details/${content.identifier}" target="_blank" class="text-blue-600 hover:underline mt-4 inline-block">View on Internet Archive</a>
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

function updatePagination(currentPage, totalPages, query) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    paginationContainer.classList.remove('hidden');

    const createPageButton = (page, text) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.classList.add('px-3', 'py-1', 'mx-1', 'rounded');
        button.disabled = page === currentPage;
        button.addEventListener('click', () => fetchSearchResults(query, page));
        return button;
    };

    if (currentPage > 1) {
        paginationContainer.appendChild(createPageButton(currentPage - 1, 'Previous'));
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        paginationContainer.appendChild(createPageButton(i, i.toString()));
    }

    if (currentPage < totalPages) {
        paginationContainer.appendChild(createPageButton(currentPage + 1, 'Next'));
    }
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

        // Limit history to 5 items
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

// Call lazyLoadImages when the page loads and after fetching search results
document.addEventListener('DOMContentLoaded', lazyLoadImages);
window.addEventListener('load', lazyLoadImages);
