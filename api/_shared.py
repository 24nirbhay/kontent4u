import json
import os
import time
import uuid
from datetime import date
from functools import lru_cache

import requests
from dotenv import load_dotenv
from google import genai
from supabase import create_client

load_dotenv()


class APIError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def get_env(*names, default=None):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


@lru_cache(maxsize=1)
def get_supabase_client():
    supabase_url = get_env('SUPABASE_URL', 'REACT_APP_SUPABASE_URL')
    supabase_key = get_env('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        raise APIError(
            500,
            'Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
        )

    return create_client(supabase_url, supabase_key)


def write_json(handler, status_code, payload):
    body = json.dumps(payload).encode('utf-8')
    handler.send_response(status_code)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    handler.send_header('Cache-Control', 'no-store')
    handler.end_headers()
    handler.wfile.write(body)


def handle_options(handler):
    handler.send_response(204)
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    handler.send_header('Cache-Control', 'no-store')
    handler.end_headers()


def _format_number(value):
    try:
        return f'{int(value):,}'
    except (TypeError, ValueError):
        return str(value or 0)


def verify_user(authorization: str):
    if not authorization or not authorization.startswith('Bearer '):
        raise APIError(401, 'Missing or invalid token')

    token = authorization.split(' ', 1)[1]
    supabase = get_supabase_client()
    user_resp = supabase.auth.get_user(token)

    if not user_resp or not user_resp.user:
        raise APIError(401, 'Unauthorized session')

    return user_resp.user


def check_daily_limit(email: str):
    today = str(date.today())
    supabase = get_supabase_client()
    response = supabase.table('user_usage').select('*').eq('user_email', email).execute()

    if len(response.data) == 0:
        supabase.table('user_usage').insert({
            'user_email': email,
            'last_generation_date': today,
            'generation_count': 1,
        }).execute()
        return 1

    user_record = response.data[0]

    if user_record['last_generation_date'] != today:
        supabase.table('user_usage').update({
            'last_generation_date': today,
            'generation_count': 1,
        }).eq('user_email', email).execute()
        return 1

    if user_record['generation_count'] >= 3:
        raise APIError(
            429,
            f'Daily generation limit (3/day) reached for {email}. Please try again tomorrow.'
        )

    new_count = user_record['generation_count'] + 1
    supabase.table('user_usage').update({
        'generation_count': new_count,
    }).eq('user_email', email).execute()

    return new_count


def generate_with_fallback(prompt: str):
    api_key = get_env('GEMINI_API_KEY')

    if not api_key or api_key == 'your_google_ai_studio_api_key_here':
        return f'[MOCK MODE OUTPUT]: Simulated AI response for prompt: {prompt[:30]}...'

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=prompt,
        )
        return response.text or ''
    except Exception as error:
        print(f'Primary model failed: {error}. Falling back to Flash...')
        try:
            response = client.models.generate_content(
                model='gemini-flash-latest',
                contents=prompt,
            )
            return response.text or ''
        except Exception as fallback_error:
            print(f'[CRITICAL AI ERROR]: {fallback_error}')
            return '[ERROR] AI Failed. Check Python terminal for details.'


def get_trends():
    trends = []

    try:
        yt_response = requests.get(
            'https://api.scrapecreators.com/v1/youtube/shorts/trending',
            headers={
                'x-api-key': get_env('SCRAPECREATORS_API_KEY')
            },
            timeout=10,
        )

        yt_response.raise_for_status()
        shorts = yt_response.json().get('data', [])

        for short in shorts[:5]:
            title = short.get('title', 'Trending YouTube Short')

            if len(title) > 75:
                title = title[:72] + '...'

            trends.append({
                'id': str(uuid.uuid4()),
                'title': title,
                'sourcePlatform': 'YouTube Shorts',
                'metrics': f"{_format_number(short.get('viewCount', 0))} Views",
                'linkUrl': short.get('url', '#'),
            })

    except Exception as yt_error:
        print(f'[YOUTUBE API ERROR]: {yt_error}')

    try:
        response = requests.get(
            'https://www.reddit.com/r/technology/hot.json?limit=6',
            headers={'User-Agent': 'kontent4u-college-demo/1.0'},
            timeout=5,
        )

        response.raise_for_status()
        data = response.json()

        for post in data['data']['children']:
            post_data = post['data']

            if post_data.get('stickied'):
                continue

            title = post_data.get('title', 'Trending Topic')

            if len(title) > 75:
                title = title[:72] + '...'

            trends.append({
                'id': str(uuid.uuid4()),
                'title': title,
                'sourcePlatform': 'Reddit',
                'metrics': f"{_format_number(post_data.get('ups', 0))} Upvotes",
                'linkUrl': f"https://www.reddit.com{post_data.get('permalink', '')}",
            })

    except Exception as reddit_error:
        print(f'[REDDIT API ERROR]: {reddit_error}')

    if not trends:
        return [
            {
                'id': str(uuid.uuid4()),
                'title': 'Day in the life of a CS major',
                'sourcePlatform': 'YouTube',
                'metrics': '1.2M Views',
                'linkUrl': '#',
            },
            {
                'id': str(uuid.uuid4()),
                'title': 'Top AI tools for productivity',
                'sourcePlatform': 'Instagram',
                'metrics': '800K Likes',
                'linkUrl': '#',
            },
        ]

    return trends[:10]


def build_brainstorm_response(payload: dict, authorization: str):
    user_prompt = (payload.get('userPrompt') or '').strip()
    target_audience = (payload.get('targetAudience') or '').strip()
    derived_trend_context = (payload.get('derivedTrendContext') or '').strip()

    if not user_prompt or not target_audience or not derived_trend_context:
        raise APIError(400, 'Missing required brainstorm fields.')

    user = verify_user(authorization)
    current_count = check_daily_limit(user.email)

    prompt_1 = (
        f'Draft a video script outline for {target_audience}. '
        f'Context: {user_prompt}. Tone: {derived_trend_context}.'
    )
    agent_1_draft = generate_with_fallback(prompt_1)
    time.sleep(2)

    prompt_2 = (
        f'Strictly fact-check this script draft and enforce a '
        f'{derived_trend_context} tone: {agent_1_draft}'
    )
    agent_2_critique = generate_with_fallback(prompt_2)
    time.sleep(2)

    prompt_3 = (
        f'Merge this draft: {agent_1_draft} with this critique: '
        f'{agent_2_critique} into a final polished Markdown script.'
    )
    final_script = generate_with_fallback(prompt_3)

    return {
        'status': 'success',
        'turnCount': 3,
        'currentCount': current_count,
        'remainingUses': max(0, 3 - current_count),
        'finalScript': final_script,
        'logs': [
            f'[LOG] JWT Authorized. User verified: {user.email}',
            f'[LOG] Generation {current_count}/3 used today.',
            '[LOG] Agent 1 drafted concept.',
            '[LOG] Agent 2 completed strict fact-check.',
            '[LOG] Agent 3 synthesized final script.',
        ],
    }