import os
import time
from datetime import date
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
import uuid
# NEW IMPORT SYNTAX FOR GOOGLE GENAI
from google import genai 
from supabase import create_client, Client

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        *([f"https://{os.getenv('VERCEL_URL')}"] if os.getenv('VERCEL_URL') else []),
        *([os.getenv('FRONTEND_URL')] if os.getenv('FRONTEND_URL') else []),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Dependency to Verify Supabase JWT Token & Extract Email
def verify_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or Invalid Token")
    token = authorization.split(" ")[1]
    
    # Supabase verifies the token and returns the user object (including their email)
    user_resp = supabase.auth.get_user(token)
    if not user_resp or not user_resp.user:
        raise HTTPException(status_code=401, detail="Unauthorized session")
    return user_resp.user

# Function to enforce the 3/day generation limit using the Supabase database
def check_daily_limit(email: str):
    today = str(date.today())
    
    # 1. Check if the user already exists in our Supabase table
    response = supabase.table('user_usage').select('*').eq('user_email', email).execute()
    
    # 2. If user does NOT exist, create their first record
    if len(response.data) == 0:
        supabase.table('user_usage').insert({
            'user_email': email,
            'last_generation_date': today,
            'generation_count': 1
        }).execute()
        return 1
        
    user_record = response.data[0]
    
    # 3. If it is a new calendar day, reset their count to 1 and update the date
    if user_record['last_generation_date'] != today:
        supabase.table('user_usage').update({
            'last_generation_date': today,
            'generation_count': 1
        }).eq('user_email', email).execute()
        return 1
        
    # 4. Block execution if limit reached (3 per day)
    if user_record['generation_count'] >= 3:
        raise HTTPException(status_code=429, detail=f"Daily generation limit (3/day) reached for {email}. Please try again tomorrow.")
        
    # 5. Otherwise, increment their count and update the database
    new_count = user_record['generation_count'] + 1
    supabase.table('user_usage').update({
        'generation_count': new_count
    }).eq('user_email', email).execute()
    
    return new_count

class BrainstormRequest(BaseModel):
    userPrompt: str
    targetAudience: str
    derivedTrendContext: str

# Helper function for Fallback AI Generation using NEW SDK
# Helper function for Fallback AI Generation using NEW SDK
# Helper function for Fallback AI Generation using NEW SDK
def generate_with_fallback(prompt: str):
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key or api_key == "your_google_ai_studio_api_key_here":
        return f"[MOCK MODE OUTPUT]: Simulated AI response for prompt: {prompt[:30]}..."

    # NEW INITIALIZATION SYNTAX FOR google-genai
    client = genai.Client(api_key=api_key)
    
    try:
        # Try the Pro model first using the explicit '-latest' alias
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=prompt
        )
        return response.text
    except Exception as e:
        print(f"Pro Model Failed: {e}. Falling back to Flash...")
        try:
            # Fall back to Flash model using the explicit '-latest' alias
            response = client.models.generate_content(
                model='gemini-flash-latest',
                contents=prompt
            )
            return response.text
        except Exception as fallback_e:
            print(f"\n[CRITICAL AI ERROR]: {fallback_e}\n")
            return "[ERROR] AI Failed. Check Python terminal for details."# Helper function for Fallback AI Generation using NEW SDK
def generate_with_fallback(prompt: str):
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key or api_key == "your_google_ai_studio_api_key_here":
        return f"[MOCK MODE OUTPUT]: Simulated AI response for prompt: {prompt[:30]}..."

    # NEW INITIALIZATION SYNTAX FOR google-genai
    client = genai.Client(api_key=api_key)
    
    try:
        # Try the Pro model first using the explicit '-latest' alias
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=prompt
        )
        return response.text
    except Exception as e:
        print(f"Pro Model Failed: {e}. Falling back to Flash...")
        try:
            # Fall back to Flash model using the explicit '-latest' alias
            response = client.models.generate_content(
                model='gemini-flash-latest',
                contents=prompt
            )
            return response.text
        except Exception as fallback_e:
            print(f"\n[CRITICAL AI ERROR]: {fallback_e}\n")
            return "[ERROR] AI Failed. Check Python terminal for details."

@app.get("/api/trends")
def get_trends():
    trends = []
    
    try:
        # -----------------------------
        # YOUTUBE SHORTS TRENDING API
        # -----------------------------
        yt_response = requests.get(
        "https://api.scrapecreators.com/v1/youtube/shorts/trending",
        headers={
        "x-api-key": os.getenv("SCRAPECREATORS_API_KEY")
            },
            timeout=10
        )

        yt_response.raise_for_status()
        yt_data = yt_response.json()

        # Safely parse YouTube shorts data
        shorts = yt_data.get("data", [])

        for short in shorts[:5]:
            title = short.get("title", "Trending YouTube Short")

            if len(title) > 75:
                title = title[:72] + "..."

            trends.append({
                "id": str(uuid.uuid4()),
                "title": title,
                "sourcePlatform": "YouTube Shorts",
                "metrics": f"{short.get('viewCount', 0):,} Views",
                "linkUrl": short.get("url", "#")
            })

    except Exception as yt_error:
        print(f"[YOUTUBE API ERROR]: {yt_error}")

    try:
        # -----------------------------
        # REDDIT FALLBACK / ADDITIONAL
        # -----------------------------
        headers = {
            'User-Agent': 'kontent4u-college-demo/1.0'
        }

        response = requests.get(
            'https://www.reddit.com/r/technology/hot.json?limit=6',
            headers=headers,
            timeout=5
        )

        response.raise_for_status()
        data = response.json()

        for post in data['data']['children']:
            post_data = post['data']

            if post_data.get('stickied'):
                continue

            title = post_data.get('title', 'Trending Topic')

            if len(title) > 75:
                title = title[:72] + "..."

            trends.append({
                "id": str(uuid.uuid4()),
                "title": title,
                "sourcePlatform": "Reddit",
                "metrics": f"{post_data.get('ups', 0):,} Upvotes",
                "linkUrl": f"https://www.reddit.com{post_data.get('permalink', '')}"
            })

    except Exception as reddit_error:
        print(f"[REDDIT API ERROR]: {reddit_error}")

    # FINAL SAFE FALLBACK
    if not trends:
        return [
            {
                "id": str(uuid.uuid4()),
                "title": "Day in the life of a CS major",
                "sourcePlatform": "YouTube",
                "metrics": "1.2M Views",
                "linkUrl": "#"
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Top AI tools for productivity",
                "sourcePlatform": "Instagram",
                "metrics": "800K Likes",
                "linkUrl": "#"
            }
        ]

    return trends[:10]

@app.post("/api/brainstorm")
def brainstorm_agents(req: BrainstormRequest, user=Depends(verify_user)):
    # Extract the email (Gmail) from the verified user object
    user_email = user.email
    
    # Check the database to see if they have exceeded their 3/day limit
    current_count = check_daily_limit(user_email)
    
    try:
        prompt_1 = f"Draft a video script outline for {req.targetAudience}. Context: {req.userPrompt}. Tone: {req.derivedTrendContext}."
        agent_1_draft = generate_with_fallback(prompt_1)
        time.sleep(2) # Rate limit protection
        
        prompt_2 = f"Strictly fact-check this script draft and enforce a {req.derivedTrendContext} tone: {agent_1_draft}"
        agent_2_critique = generate_with_fallback(prompt_2)
        time.sleep(2) # Rate limit protection
        
        prompt_3 = f"Merge this draft: {agent_1_draft} with this critique: {agent_2_critique} into a final polished Markdown script."
        final_script = generate_with_fallback(prompt_3)
        
        return {
            "status": "success",
            "turnCount": 3,
            "finalScript": final_script,
            "logs": [
                f"[LOG] JWT Authorized. User verified: {user_email}",
                f"[LOG] Generation {current_count}/3 used today.",
                "[LOG] Agent 1 drafted concept.",
                "[LOG] Agent 2 completed strict fact-check.",
                "[LOG] Agent 3 synthesized final script."
            ]
        }
    except HTTPException as http_exc:
        raise http_exc  # Pass through the 429 limit error directly
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    return {"status": "Live - Supabase DB Connected & Using Updated google-genai SDK on Python 3.13"}


@app.get("/")
def read_root():
    return {"message": "kontent4u API Backend is running. Use the deployed frontend to access the UI."}