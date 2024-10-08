import asyncio
import aiohttp
from aiohttp import ClientTimeout
from flask import jsonify
import os

async def fetch_data(session, url, params=None, headers=None):
    try:
        async with session.get(url, params=params, headers=headers, timeout=ClientTimeout(total=10)) as response:
            if response.status == 200:
                return await response.json()
            else:
                print(f"Error fetching data from {url}: Status {response.status}")
                return None
    except asyncio.TimeoutError:
        print(f"Timeout error for URL: {url}")
        return None
    except Exception as e:
        print(f"Error fetching data from {url}: {str(e)}")
        return None

async def search_wikipedia(query):
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "format": "json"
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return data["query"]["search"] if data and "query" in data else []

async def search_internet_archive(query):
    url = "https://archive.org/advancedsearch.php"
    params = {
        "q": query,
        "output": "json"
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return data["response"]["docs"] if data and "response" in data else []

async def search_met_museum(query):
    search_url = "https://collectionapi.metmuseum.org/public/collection/v1/search"
    params = {"q": query}
    async with aiohttp.ClientSession() as session:
        search_data = await fetch_data(session, search_url, params)
        if not search_data or "objectIDs" not in search_data:
            return []

        object_ids = search_data["objectIDs"][:5]  # Limit to 5 results for faster loading
        object_tasks = [fetch_data(session, f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}") for object_id in object_ids]
        objects = await asyncio.gather(*object_tasks)
        return [obj for obj in objects if obj]

async def search_rijksmuseum(query):
    url = "https://www.rijksmuseum.nl/api/en/collection"
    params = {
        "key": os.environ.get("RIJKSMUSEUM_API_KEY"),
        "q": query,
        "format": "json",
        "ps": 5  # Limit to 5 results
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return data["artObjects"] if data and "artObjects" in data else []

async def search_harvard_art_museums(query):
    url = "https://api.harvardartmuseums.org/object"
    params = {
        "apikey": os.environ.get("HARVARD_ART_MUSEUMS_API_KEY"),
        "q": query,
        "size": 5  # Limit to 5 results
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return data["records"] if data and "records" in data else []

async def search_cooper_hewitt(query):
    url = "https://api.collection.cooperhewitt.org/rest/"
    params = {
        "method": "cooperhewitt.search.objects",
        "access_token": os.environ.get("COOPER_HEWITT_API_KEY"),
        "query": query,
        "page": 1,
        "per_page": 5  # Limit to 5 results
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return data["objects"] if data and "objects" in data else []

async def search_perplexity(query):
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.environ.get('PERPLEXITY_API_KEY')}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "pplx-7b-online",
        "messages": [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": query}]
    }
    async with aiohttp.ClientSession() as session:
        response = await fetch_data(session, url, headers=headers, params=data)
        if response and "choices" in response:
            return [{"content": choice["message"]["content"]} for choice in response["choices"]]
        return []

async def perform_search(query):
    tasks = [
        search_wikipedia(query),
        search_internet_archive(query),
        search_met_museum(query),
        search_rijksmuseum(query),
        search_harvard_art_museums(query),
        search_cooper_hewitt(query),
        search_perplexity(query)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    sources = ['wikipedia', 'internet_archive', 'met_museum', 'rijksmuseum', 'harvard_art_museums', 'cooper_hewitt', 'perplexity']
    search_results = {}
    errors = {}

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            errors[sources[i]] = str(result)
            search_results[sources[i]] = []
        else:
            search_results[sources[i]] = result

    return {
        "results": search_results,
        "errors": errors
    }
