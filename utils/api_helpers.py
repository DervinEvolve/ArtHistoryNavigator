import requests

def search_wikipedia(query):
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json"
    response = requests.get(url)
    data = response.json()
    return data["query"]["search"]

def search_internet_archive(query):
    url = f"https://archive.org/advancedsearch.php?q={query}&output=json"
    response = requests.get(url)
    data = response.json()
    return data["response"]["docs"]

def search_met_museum(query):
    url = f"https://collectionapi.metmuseum.org/public/collection/v1/search?q={query}"
    response = requests.get(url)
    data = response.json()
    object_ids = data["objectIDs"][:10]  # Limit to 10 results
    
    results = []
    for object_id in object_ids:
        object_url = f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"
        object_response = requests.get(object_url)
        object_data = object_response.json()
        results.append(object_data)
    
    return results
