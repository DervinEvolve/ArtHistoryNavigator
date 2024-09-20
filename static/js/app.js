document.addEventListener('DOMContentLoaded', () => {
    const searchResults = document.getElementById('search-results');
    const detailsContainer = document.getElementById('details-container');
    const modal = document.getElementById('modal');
    const closeModal = document.getElementById('close-modal');

    if (searchResults) {
        const query = new URLSearchParams(window.location.search).get('q');
        if (query) {
            fetchSearchResults(query);
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

async function fetchSearchResults(query) {
    const wikipediaResults = document.querySelector('#wikipedia-results ul');
    const internetArchiveResults = document.querySelector('#internet-archive-results ul');
    const metMuseumResults = document.querySelector('#met-museum-results ul');
    const noResultsMessage = document.getElementById('no-results');
    const searchResults = document.getElementById('search-results');

    const loadingIndicators = document.querySelectorAll('.loading');
    loadingIndicators.forEach(indicator => {
        indicator.classList.remove('hidden');
        indicator.innerHTML = '<p class="text-center">Loading...</p>';
    });

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const hasWikipediaResults = updateResultSection(wikipediaResults, data.wikipedia, 'wikipedia');
        const hasInternetArchiveResults = updateResultSection(internetArchiveResults, data.internet_archive, 'internet_archive');
        const hasMetMuseumResults = updateResultSection(metMuseumResults, data.met_museum, 'met_museum');

        if (!hasWikipediaResults && !hasInternetArchiveResults && !hasMetMuseumResults) {
            noResultsMessage.classList.remove('hidden');
            searchResults.classList.add('hidden');
        } else {
            noResultsMessage.classList.add('hidden');
            searchResults.classList.remove('hidden');
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
        <div class="search-result-card bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
            <h3 class="text-lg font-semibold text-blue-600 hover:underline mb-2">${result.title}</h3>
            ${result.primaryImageSmall ? `<img src="${result.primaryImageSmall}" alt="${result.title}" class="mb-2 rounded">` : ''}
            <p class="text-sm text-gray-600 mb-2 flex-grow">${truncateText(result.snippet || result.description || '', 100)}</p>
            <button class="read-more-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200" data-source="${source}" data-content='${JSON.stringify(result)}'>Read More</button>
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

async function fetchDetails(source, id) {
    const detailsTitle = document.getElementById('details-title');
    const detailsContent = document.getElementById('details-content');

    detailsContent.innerHTML = '<div class="loading"><p class="text-center">Loading...</p></div>';

    try {
        let data;
        switch (source) {
            case 'wikipedia':
                data = await fetchWikipediaDetails(id);
                break;
            case 'internet_archive':
                data = await fetchInternetArchiveDetails(id);
                break;
            case 'met_museum':
                data = await fetchMetMuseumDetails(id);
                break;
            default:
                throw new Error('Invalid source');
        }

        detailsTitle.textContent = data.title;
        detailsContent.innerHTML = data.content;
        lazyLoadImages();
    } catch (error) {
        console.error('Error fetching details:', error);
        detailsContent.innerHTML = '<p class="text-red-600 font-semibold">Error loading details. Please try again later.</p>';
    }
}

async function fetchWikipediaDetails(id) {
    const response = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&pageid=${id}&format=json&origin=*`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return {
        title: data.parse.title,
        content: data.parse.text['*']
    };
}

async function fetchInternetArchiveDetails(id) {
    const response = await fetch(`https://archive.org/metadata/${id}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return {
        title: data.metadata.title,
        content: `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <p class="mb-4"><strong>Description:</strong> ${data.metadata.description || 'N/A'}</p>
                <p class="mb-4"><strong>Creator:</strong> ${data.metadata.creator || 'N/A'}</p>
                <p class="mb-4"><strong>Date:</strong> ${data.metadata.date || 'N/A'}</p>
                <p><a href="https://archive.org/details/${id}" target="_blank" class="text-blue-600 hover:underline">View on Internet Archive</a></p>
            </div>
        `
    };
}

async function fetchMetMuseumDetails(id) {
    const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return {
        title: data.title,
        content: `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <img src="${data.primaryImage}" alt="${data.title}" class="max-w-full h-auto mb-4 rounded lazy-load">
                <p class="mb-2"><strong>Artist:</strong> ${data.artistDisplayName || 'N/A'}</p>
                <p class="mb-2"><strong>Date:</strong> ${data.objectDate || 'N/A'}</p>
                <p class="mb-2"><strong>Medium:</strong> ${data.medium || 'N/A'}</p>
                <p class="mb-2"><strong>Dimensions:</strong> ${data.dimensions || 'N/A'}</p>
                <p class="mb-4"><strong>Department:</strong> ${data.department || 'N/A'}</p>
                <p><a href="${data.objectURL}" target="_blank" class="text-blue-600 hover:underline">View on Met Museum Website</a></p>
            </div>
        `
    };
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
