import asyncio
import httpx
import os

async def main():
    async with httpx.AsyncClient() as client:
        files = {'file': ('test.csv', b"description,quantity,unit\ncement 50kg,10,bags\nsteel rebar y12,100,m\n")}
        data = {
            'location': 'Johannesburg',
            'deepseek_key': os.getenv('GROQ_API_KEY', 'x')
        }
        async with client.stream("POST", "http://127.0.0.1:8001/boq/extract", data=data, files=files, timeout=60.0) as resp:
            async for chunk in resp.aiter_lines():
                print(chunk)

asyncio.run(main())
