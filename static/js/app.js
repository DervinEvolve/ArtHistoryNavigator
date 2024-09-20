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

    wikipediaResults.innerHTML = '<div class="loading"></div>';
    internetArchiveResults.innerHTML = '<div class="loading"></div>';
    metMuseumResults.innerHTML = '<div class="loading"></div>';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        wikipediaResults.innerHTML = '';
        data.wikipedia.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="/details/wikipedia/${encodeURIComponent(result.pageid)}" class="text-blue-600 hover:underline">${result.title}</a>`;
            wikipediaResults.appendChild(li);
        });

        internetArchiveResults.innerHTML = '';
        data.internet_archive.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="/details/internet_archive/${encodeURIComponent(result.identifier)}" class="text-blue-600 hover:underline">${result.title}</a>`;
            internetArchiveResults.appendChild(li);
        });

        metMuseumResults.innerHTML = '';
        data.met_museum.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="/details/met_museum/${encodeURIComponent(result.objectID)}" class="text-blue-600 hover:underline">${result.title}</a>`;
            metMuseumResults.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching search results:', error);
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
        detailsContent.innerHTML = '<p class="text-red-600">Error loading details. Please try again later.</p>';
    }
}

async function fetchWikipediaDetails(id) {
    const response = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&pageid=${id}&format=json&origin=*`);
    const data = await response.json();
    return {
        title: data.parse.title,
        content: data.parse.text['*']
    };
}

async function fetchInternetArchiveDetails(id) {
    const response = await fetch(`https://archive.org/metadata/${id}`);
    const data = await response.json();
    return {
        title: data.metadata.title,
        content: `
            <p><strong>Description:</strong> ${data.metadata.description || 'N/A'}</p>
            <p><strong>Creator:</strong> ${data.metadata.creator || 'N/A'}</p>
            <p><strong>Date:</strong> ${data.metadata.date || 'N/A'}</p>
            <p><a href="https://archive.org/details/${id}" target="_blank" class="text-blue-600 hover:underline">View on Internet Archive</a></p>
        `
    };
}

async function fetchMetMuseumDetails(id) {
    const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
    const data = await response.json();
    return {
        title: data.title,
        content: `
            <img src="${data.primaryImage}" alt="${data.title}" class="max-w-full h-auto mb-4">
            <p><strong>Artist:</strong> ${data.artistDisplayName || 'N/A'}</p>
            <p><strong>Date:</strong> ${data.objectDate || 'N/A'}</p>
            <p><strong>Medium:</strong> ${data.medium || 'N/A'}</p>
            <p><strong>Dimensions:</strong> ${data.dimensions || 'N/A'}</p>
            <p><strong>Department:</strong> ${data.department || 'N/A'}</p>
            <p><a href="${data.objectURL}" target="_blank" class="text-blue-600 hover:underline">View on Met Museum Website</a></p>
        `
    };
}
