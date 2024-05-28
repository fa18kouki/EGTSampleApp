import copy
import json
import os
import logging
import uuid
from dotenv import load_dotenv
import httpx
from quart import (
    Blueprint,
    Quart,
    jsonify,
    make_response,
    request,
    send_from_directory,
    render_template,
    session,
    url_for,
    redirect,
)
from azure.identity.aio import (
    DefaultAzureCredential,
    get_bearer_token_provider
)
from openai import AsyncOpenAI
from openai import AsyncAzureOpenAI
from backend.auth.auth_utils import get_authenticated_user_details, fetch_users
from backend.history.cosmosdbservice import CosmosConversationClient
from backend.prompt.cosmosdbservice import CosmosPromptClient
from backend.utils import (
    format_as_ndjson,
    format_stream_response,
    generateFilterString,
    parse_multi_columns,
    format_non_streaming_response,    
)

bp = Blueprint("routes", __name__, static_folder="static",
               template_folder="static")

# Current minimum Azure OpenAI version supported
MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION = "2024-02-15-preview"

load_dotenv()

# UI configuration (optional)
UI_TITLE = os.environ.get("UI_TITLE") or "Contoso"
UI_LOGO = os.environ.get("UI_LOGO")
UI_CHAT_LOGO = os.environ.get("UI_CHAT_LOGO")
UI_CHAT_TITLE = os.environ.get("UI_CHAT_TITLE") or "Start chatting"
UI_CHAT_DESCRIPTION = (
    os.environ.get("UI_CHAT_DESCRIPTION")
    or "This chatbot is configured to answer your questions"
)
UI_FAVICON = os.environ.get("UI_FAVICON") or "/favicon.ico"
UI_SHOW_SHARE_BUTTON = os.environ.get(
    "UI_SHOW_SHARE_BUTTON", "true").lower() == "true"


def create_app():
    app = Quart(__name__)
    app.register_blueprint(bp)
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.secret_key = 'your_secure_secret_key'  # セッションを安全に扱うために強力な秘密鍵を設定
    return app


@bp.route("/")
async def index():
    return await render_template("index.html", title=UI_TITLE, favicon=UI_FAVICON)


@bp.route("/favicon.ico")
async def favicon():
    return await bp.send_static_file("favicon.ico")


@bp.route("/assets/<path:path>")
async def assets(path):
    return await send_from_directory("static/assets", path)


# Debug settings
DEBUG = os.environ.get("DEBUG", "false")
if DEBUG.lower() == "true":
    logging.basicConfig(level=logging.DEBUG)

USER_AGENT = "kouki"

#OPEM AI API KEY
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# On Your Data Settings
DATASOURCE_TYPE = os.environ.get("DATASOURCE_TYPE", "AzureCognitiveSearch")
SEARCH_TOP_K = os.environ.get("SEARCH_TOP_K", 5)
SEARCH_STRICTNESS = os.environ.get("SEARCH_STRICTNESS", 3)
SEARCH_ENABLE_IN_DOMAIN = os.environ.get("SEARCH_ENABLE_IN_DOMAIN", "true")

# ACS Integration Settings
AZURE_SEARCH_SERVICE = os.environ.get("AZURE_SEARCH_SERVICE")
AZURE_SEARCH_INDEX = os.environ.get("AZURE_SEARCH_INDEX")
AZURE_SEARCH_KEY = os.environ.get("AZURE_SEARCH_KEY", None)
AZURE_SEARCH_USE_SEMANTIC_SEARCH = os.environ.get(
    "AZURE_SEARCH_USE_SEMANTIC_SEARCH", "false"
)
AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG = os.environ.get(
    "AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG", "default"
)
AZURE_SEARCH_TOP_K = os.environ.get("AZURE_SEARCH_TOP_K", SEARCH_TOP_K)
AZURE_SEARCH_ENABLE_IN_DOMAIN = os.environ.get(
    "AZURE_SEARCH_ENABLE_IN_DOMAIN", SEARCH_ENABLE_IN_DOMAIN
)
AZURE_SEARCH_CONTENT_COLUMNS = os.environ.get("AZURE_SEARCH_CONTENT_COLUMNS")
AZURE_SEARCH_FILENAME_COLUMN = os.environ.get("AZURE_SEARCH_FILENAME_COLUMN")
AZURE_SEARCH_TITLE_COLUMN = os.environ.get("AZURE_SEARCH_TITLE_COLUMN")
AZURE_SEARCH_URL_COLUMN = os.environ.get("AZURE_SEARCH_URL_COLUMN")
AZURE_SEARCH_VECTOR_COLUMNS = os.environ.get("AZURE_SEARCH_VECTOR_COLUMNS")
AZURE_SEARCH_QUERY_TYPE = os.environ.get("AZURE_SEARCH_QUERY_TYPE")
AZURE_SEARCH_PERMITTED_GROUPS_COLUMN = os.environ.get(
    "AZURE_SEARCH_PERMITTED_GROUPS_COLUMN"
)
AZURE_SEARCH_STRICTNESS = os.environ.get(
    "AZURE_SEARCH_STRICTNESS", SEARCH_STRICTNESS)

# AOAI Integration Settings
AZURE_OPENAI_RESOURCE = os.environ.get("AZURE_OPENAI_RESOURCE")
AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_KEY = os.environ.get("AZURE_OPENAI_KEY")
AZURE_OPENAI_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_TEMPERATURE = os.environ.get("AZURE_OPENAI_TEMPERATURE", 0)
AZURE_OPENAI_TOP_P = os.environ.get("AZURE_OPENAI_TOP_P", 1.0)
AZURE_OPENAI_MAX_TOKENS = os.environ.get("AZURE_OPENAI_MAX_TOKENS", 1000)
AZURE_OPENAI_STOP_SEQUENCE = os.environ.get("AZURE_OPENAI_STOP_SEQUENCE")
AZURE_OPENAI_SYSTEM_MESSAGE = os.environ.get(
    "AZURE_OPENAI_SYSTEM_MESSAGE",
    "You are an AI assistant that helps people find information.",
)
AZURE_OPENAI_PREVIEW_API_VERSION = os.environ.get(
    "AZURE_OPENAI_PREVIEW_API_VERSION",
    MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION,
)
AZURE_OPENAI_STREAM = os.environ.get("AZURE_OPENAI_STREAM", "true")
AZURE_OPENAI_GPT4_DEPLOYMENT = os.environ.get("AZURE_OPENAI_GPT4_DEPLOYMENT")
AZURE_OPENAI_GPT4_MODEL = os.environ.get("AZURE_OPENAI_GPT4_MODEL")
AZURE_OPENAI_GPT35_TURBO_16K_DEPLOYMENT = os.environ.get(
    "AZURE_OPENAI_GPT35_TURBO_16K_DEPLOYMENT")
AZURE_OPENAI_GPT35_TURBO_16K_MODEL = os.environ.get(
    "AZURE_OPENAI_GPT35_TURBO_16K_MODEL")

AZURE_OPENAI_EMBEDDING_ENDPOINT = os.environ.get(
    "AZURE_OPENAI_EMBEDDING_ENDPOINT")
AZURE_OPENAI_EMBEDDING_KEY = os.environ.get("AZURE_OPENAI_EMBEDDING_KEY")
AZURE_OPENAI_EMBEDDING_NAME = os.environ.get("AZURE_OPENAI_EMBEDDING_NAME", "")
SHOULD_STREAM = True if AZURE_OPENAI_STREAM.lower() == "true" else False

# Chat History CosmosDB Integration Settings
AZURE_COSMOSDB_DATABASE = os.environ.get("AZURE_COSMOSDB_DATABASE")
AZURE_COSMOSDB_ACCOUNT = os.environ.get("AZURE_COSMOSDB_ACCOUNT")
AZURE_COSMOSDB_CONVERSATIONS_CONTAINER = os.environ.get(
    "AZURE_COSMOSDB_CONVERSATIONS_CONTAINER"
)
AZURE_COSMOSDB_ACCOUNT_KEY = os.environ.get("AZURE_COSMOSDB_ACCOUNT_KEY")
AZURE_COSMOSDB_ENABLE_FEEDBACK = (
    os.environ.get("AZURE_COSMOSDB_ENABLE_FEEDBACK", "false").lower() == "true"
)
# Prompt CosmosDB Integration Settings
AZURE_COSMOSDB_PROMPTS_CONTAINER = os.environ.get("AZURE_COSMOSDB_PROMPTS_CONTAINER", "prompts")
# Frontend Settings via Environment Variables
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "true").lower() == "true"
CHAT_HISTORY_ENABLED = (
    AZURE_COSMOSDB_ACCOUNT
    and AZURE_COSMOSDB_DATABASE
    and AZURE_COSMOSDB_CONVERSATIONS_CONTAINER
)
SANITIZE_ANSWER = os.environ.get("SANITIZE_ANSWER", "false").lower() == "true"
frontend_settings = {
    "auth_enabled": AUTH_ENABLED,
    "feedback_enabled": AZURE_COSMOSDB_ENABLE_FEEDBACK and CHAT_HISTORY_ENABLED,
    "ui": {
        "title": UI_TITLE,
        "logo": UI_LOGO,
        "chat_logo": UI_CHAT_LOGO or UI_LOGO,
        "chat_title": UI_CHAT_TITLE,
        "chat_description": UI_CHAT_DESCRIPTION,
        "show_share_button": UI_SHOW_SHARE_BUTTON,
    },
    "sanitize_answer": SANITIZE_ANSWER,
}


# Initialize Azure OpenAI Client
def init_openai_client():
    azure_openai_client = None
    try:
        # Authentication
        aoai_api_key = OPENAI_API_KEY
        ad_token_provider = None
        if not aoai_api_key:
            logging.debug("No AZURE_OPENAI_KEY found, using Azure AD auth")
            ad_token_provider = get_bearer_token_provider(
                DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
            )

        # Deployment
        deployment = AZURE_OPENAI_GPT4_DEPLOYMENT
        if not deployment:
            raise Exception("AZURE_OPENAI_MODEL is required")
        # Default Headers
        default_headers = {"x-ms-useragent": USER_AGENT}

        openai_client = AsyncOpenAI(
            api_key=aoai_api_key,
            default_headers=default_headers
        )

        return openai_client
    except Exception as e:
        logging.exception("Exception in Azure OpenAI initialization", e)
        azure_openai_client = None
        raise e


def init_conversation_cosmosdb_client():
    cosmos_conversation_client = None
    try:
        cosmos_endpoint = (
            f"https://{AZURE_COSMOSDB_ACCOUNT}.documents.azure.com:443/"
        )

        if not AZURE_COSMOSDB_ACCOUNT_KEY:
            credential = DefaultAzureCredential()
        else:
            credential = AZURE_COSMOSDB_ACCOUNT_KEY

        cosmos_conversation_client = CosmosConversationClient(
            cosmosdb_endpoint=cosmos_endpoint,
            credential=credential,
            database_name=AZURE_COSMOSDB_DATABASE,
            container_name=AZURE_COSMOSDB_CONVERSATIONS_CONTAINER,
            enable_message_feedback=AZURE_COSMOSDB_ENABLE_FEEDBACK,
        )
    except Exception as e:
        logging.exception("Exception in CosmosDB initialization", e)
        cosmos_conversation_client = None
        raise e

    return cosmos_conversation_client


def init_prompt_cosmosdb_client():
    cosmos_prompt_client = None
    try:
        cosmos_endpoint = (
            f"https://{AZURE_COSMOSDB_ACCOUNT}.documents.azure.com:443/"
        )

        if not AZURE_COSMOSDB_ACCOUNT_KEY:
            credential = DefaultAzureCredential()
        else:
            credential = AZURE_COSMOSDB_ACCOUNT_KEY

        cosmos_prompt_client = CosmosPromptClient(
            cosmosdb_endpoint=cosmos_endpoint,
            credential=credential,
            database_name=AZURE_COSMOSDB_DATABASE,
            container_name=AZURE_COSMOSDB_PROMPTS_CONTAINER,
        )
    except Exception as e:
        logging.exception("Exception in CosmosDB initialization", e)
        cosmos_prompt_client = None
        raise e

    return cosmos_prompt_client

def prepare_model_args(request_body):
    request_messages = request_body.get("messages", [])
    # gptModel= AZURE_OPENAI_GPT35_TURBO_16K_DEPLOYMENT
    if request_body.get("gptModel") == "gpt-4":
        gptModel = AZURE_OPENAI_GPT4_DEPLOYMENT
    else:
        gptModel = AZURE_OPENAI_GPT35_TURBO_16K_DEPLOYMENT
    messages = []
    for message in request_messages:
        if message:
            messages.append(
                {"role": message["role"], "co