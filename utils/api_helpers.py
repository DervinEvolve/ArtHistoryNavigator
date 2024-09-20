import aiohttp
import asyncio
import os
from typing import Dict, Any, List
import logging
import openai
from dotenv import load_dotenv
from aiohttp import ClientTimeout

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

async def fetch_data(session, url, params=None, headers=None):
    try:
        async with session.get(url, params=params, headers=headers, timeout=ClientTimeout(total=10)) as response:
            if response.status == 200:
                return await response.json()
            else:
                logging.error(f"Error fetching data from {url}: Status {response.status}")
                return None
    except asyncio.TimeoutError:
        logging.error(f"Timeout error for URL: {url}")
        return None
    except Exception as e:
        logging.error(f"Error fetching data from {url}: {str(e)}")
        return None

async def perform_search(query: str, api: str = "openai") -> Dict[str, Any]:
    tasks = [
        search_rijksmuseum(query),
        search_harvard_art_museums(query),
        search_cooper_hewitt(query)
    ]

    if api == "openai":
        tasks.append(search_openai(query))
    elif api == "perplexity":
        tasks.append(search_perplexity(query))
    else:
        logging.warning(f"Invalid API selected: {api}. Defaulting to OpenAI.")
        tasks.append(search_openai(query))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    errors = []
    all_results = {}

    for result in results:
        if isinstance(result, Exception):
            errors.append(str(result))
        else:
            all_results.update(result)

    return {"results": all_results, "errors": errors}

async def search_openai(query: str) -> Dict[str, List[Dict[str, Any]]]:
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides information about art and history."},
                {"role": "user", "content": query}
            ]
        )
        return {"OpenAI": [{"title": "OpenAI Response", "description": response.choices[0].message.content}]}
    except Exception as e:
        logging.error(f"Error in OpenAI search: {str(e)}")
        return {"OpenAI": []}

async def search_perplexity(query: str) -> Dict[str, List[Dict[str, Any]]]:
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "mistral-7b-instruct",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that provides information about art and history."},
            {"role": "user", "content": query}
        ]
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, headers=headers, json=data) as response:
                if response.status == 200:
                    result = await response.json()
                    return {"Perplexity": [{"title": "Perplexity Response", "description": result['choices'][0]['message']['content']}]}
                else:
                    logging.error(f"Perplexity API error: {response.status}")
                    return {"Perplexity": []}
        except Exception as e:
            logging.error(f"Error in Perplexity search: {str(e)}")
            return {"Perplexity": []}

async def search_rijksmuseum(query: str) -> Dict[str, List[Dict[str, Any]]]:
    url = "https://www.rijksmuseum.nl/api/en/collection"
    params = {
        "key": os.environ.get("RIJKSMUSEUM_API_KEY"),
        "q": query,
        "format": "json",
        "ps": 5
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return {"Rijksmuseum": data["artObjects"] if data and "artObjects" in data else []}

async def search_harvard_art_museums(query: str) -> Dict[str, List[Dict[str, Any]]]:
    url = "https://api.harvardartmuseums.org/object"
    params = {
        "apikey": os.environ.get("HARVARD_ART_MUSEUMS_API_KEY"),
        "q": query,
        "size": 5
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return {"Harvard Art Museums": data["records"] if data and "records" in data else []}

async def search_cooper_hewitt(query: str) -> Dict[str, List[Dict[str, Any]]]:
    url = "https://api.collection.cooperhewitt.org/rest/"
    params = {
        "method": "cooperhewitt.search.objects",
        "access_token": os.environ.get("COOPER_HEWITT_API_KEY"),
        "query": query,
        "page": 1,
        "per_page": 5
    }
    async with aiohttp.ClientSession() as session:
        data = await fetch_data(session, url, params)
        return {"Cooper Hewitt": data["objects"] if data and "objects" in data else []}