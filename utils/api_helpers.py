import asyncio
import aiohttp
from aiohttp import ClientTimeout
from flask import jsonify

async def fetch_data(session, url, params=None):
    try:
        async with session.get(url, params=params, timeout=ClientTimeout(total=5)) as response:
            if response.status == 200:
                return await response.json()
            else:
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

        object_ids = search_data["objectIDs"][:10]  # Limit to 10 results
        object_tasks = [fetch_data(session, f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}") for object_id in object_ids]
        objects = await asyncio.gather(*object_tasks)
        return [obj for obj in objects if obj]

async def perform_search(query):
    tasks = [
        search_wikipedia(query),
        search_internet_archive(query),
        search_met_museum(query)
    ]
    wikipedia_results, internet_archive_results, met_museum_results = await asyncio.gather(*tasks)
    
    return {
        "wikipedia": wikipedia_results,
        "internet_archive": internet_archive_results,
        "met_museum": met_museum_results
    }
