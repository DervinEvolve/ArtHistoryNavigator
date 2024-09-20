document.addEventListener('DOMContentLoaded', () => {
    const searchResults = document.getElementById('search-results');
    const detailsContainer = document.getElementById('details-container');

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
});

async function fetchSearchResults(query) {
    const wikipediaResults = document.querySelector('#wikipedia-results ul');
    const internetArchiveResults = document.querySelector('#internet-archive-results ul');
    const metMuseumResults = document.querySelector('#met-museum-results ul');

    const loadingIndicators = document.querySelectorAll('.loading');
    loadingIndicators.forEach(indicator => indicator.classList.remove('hidden'));

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        wikipediaResults.innerHTML = '';
        data.wikipedia.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="/details/wikipedia/${encodeURIComponent(result.pageid)}" class="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200">
                    <h3 class="text-lg font-semibold text-blue-600 hover:underline">${result.title}</h3>
                    <p class="text-sm text-gray-600 mt-2">${result.snippet}</p>
                </a>
            `;
            wikipediaResults.appendChild(li);
        });

        internetArchiveResults.innerHTML = '';
        data.internet_archive.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="/details/internet_archive/${encodeURIComponent(result.identifier)}" class="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200">
                    <h3 class="text-lg font-semibold text-blue-600 hover:underline">${result.title}</h3>
                    <p class="text-sm text-gray-600 mt-2">${result.description ? result.description.slice(0, 100) + '...' : 'No description available'}</p>
                </a>
            `;
            internetArchiveResults.appendChild(li);
        });

        metMuseumResults.innerHTML = '';
        data.met_museum.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="/details/met_museum/${encodeURIComponent(result.objectID)}" class="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200">
                    <h3 class="text-lg font-semibold text-blue-600 hover:underline">${result.title}</h3>
                    <p class="text-sm text-gray-600 mt-2">${result.artistDisplayName ? 'By ' + result.artistDisplayName : 'Artist unknown'}</p>
                    ${result.primaryImageSmall ? `<img src="${result.primaryImageSmall}" alt="${result.title}" class="mt-2 max-w-full h-auto rounded">` : ''}
                </a>
            `;
            metMuseumResults.appendChild(li);
        });
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

async function fetchDetails(source, id) {
    const detailsTitle = document.getElementById('details-title');
    const detailsContent = document.getElementById('details-content');

    detailsContent.innerHTML = '<div class="loading"></div>';

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
                <img src="${data.primaryImage}" alt="${data.title}" class="max-w-full h-auto mb-4 rounded">
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
