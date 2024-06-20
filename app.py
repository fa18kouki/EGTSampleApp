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
    url_for,
    redirect,
)
from azure.identity.aio import (
    DefaultAzureCredential,
    get_bearer_token_provider
)
from openai import AsyncOpenAI
from openai import AsyncAzureOpenAI
from backend.auth.auth_utils import (
    get_userid,
    get_authenticated_user_details, 
    fetch_users,
    verify_email,
    set_custom_claims,
    AuthError,
    confirm_password_reset,
    handle_reset_password,
    handle_recover_email,
    handle_verify_email,
    create_user_and_send_verification
)
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

USER_AGENT = "egt-gpt-3-azure-openai"

# OPEM AI API KEY
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
AZURE_COSMOSDB_PROMPTS_CONTAINER = os.environ.get(
    "AZURE_COSMOSDB_PROMPTS_CONTAINER", "prompts")
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
    openai_client = None
    try:
        # Authentication
        aoai_api_key = OPENAI_API_KEY
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

# Initialize Azure OpenAI Client
def init_azopenai_client():
    azure_openai_client = None
    try:
        # API version check
        if (
            AZURE_OPENAI_PREVIEW_API_VERSION
            < MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION
        ):
            raise Exception(
                f"The minimum supported Azure OpenAI preview API version is '{MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION}'"
            )

        # Endpoint
        if not AZURE_OPENAI_ENDPOINT and not AZURE_OPENAI_RESOURCE:
            raise Exception(
                "AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_RESOURCE is required"
            )

        endpoint = (
            AZURE_OPENAI_ENDPOINT
            if AZURE_OPENAI_ENDPOINT
            else f"https://{AZURE_OPENAI_RESOURCE}.openai.azure.com/"
        )

        # Authentication
        aoai_api_key = AZURE_OPENAI_KEY
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

        azure_openai_client = AsyncAzureOpenAI(
            api_version=AZURE_OPENAI_PREVIEW_API_VERSION,
            api_key=aoai_api_key,
            azure_ad_token_provider=ad_token_provider,
            default_headers=default_headers,
            azure_endpoint=endpoint,
        )

        return azure_openai_client
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
    gptModel= request_body.get("gptModel", "gpt-3.5-turbo-0125")
    if gptModel == "gpt-3.5-turbo-0125":
        gptModel = "gpt-3.5-turbo-0125"
    elif gptModel == "gpt-4":
        gptModel = "gpt-4"
    elif gptModel == "gpt-4o":
        gptModel = "gpt-4o"
    elif gptModel == "az-gpt-3.5":
        gptModel = AZURE_OPENAI_GPT35_TURBO_16K_MODEL
    elif gptModel == "az-gpt-4":
        gptModel = AZURE_OPENAI_GPT4_MODEL
    else:
        gptModel = "gpt-3.5-turbo-0125"
    
    messages = []
    for message in request_messages:
        if message:
            messages.append(
                {"role": message["role"], "content": message["content"]})

    model_args = {
        "messages": messages,
        "temperature": float(AZURE_OPENAI_TEMPERATURE),
        "max_tokens": int(AZURE_OPENAI_MAX_TOKENS),
        "top_p": float(AZURE_OPENAI_TOP_P),
        "stop": (
            parse_multi_columns(AZURE_OPENAI_STOP_SEQUENCE)
            if AZURE_OPENAI_STOP_SEQUENCE
            else None
        ),
        "stream": True,
        "model": gptModel,
    }
    model_args_clean = copy.deepcopy(model_args)
    if model_args_clean.get("extra_body"):
        secret_params = [
            "key",
            "connection_string",
            "embedding_key",
            "encoded_api_key",
            "api_key",
        ]
        for secret_param in secret_params:
            if model_args_clean["extra_body"]["data_sources"][0]["parameters"].get(
                secret_param
            ):
                model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                    secret_param
                ] = "*****"
        authentication = model_args_clean["extra_body"]["data_sources"][0][
            "parameters"
        ].get("authentication", {})
        for field in authentication:
            if field in secret_params:
                model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                    "authentication"
                ][field] = "*****"
        embeddingDependency = model_args_clean["extra_body"]["data_sources"][0][
            "parameters"
        ].get("embedding_dependency", {})
        if "authentication" in embeddingDependency:
            for field in embeddingDependency["authentication"]:
                if field in secret_params:
                    model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                        "embedding_dependency"
                    ]["authentication"][field] = "*****"

    return model_args


async def send_chat_request(request):
    model_args = prepare_model_args(request)

    try:
        client = init_openai_client()
        response = await client.chat.completions.create(**model_args)
        print("Response: ", response)
    except Exception as e:
        logging.exception("Exception in send_chat_request")
        raise e

    return response


async def complete_chat_request(request_body):
    response = await send_chat_request(request_body)
    history_metadata = request_body.get("history_metadata", {})
    return format_non_streaming_response(response, history_metadata)


async def stream_chat_request(request_body):
    logging.debug("RequestBody: %s", request_body.get("messages"))
    response = await send_chat_request(request_body)
    file = request_body.get("file", None)
    if file:
        print("File found")
        with open(f'usr/{file.filename}', 'wb') as f:
            f.write(file.read())
    history_metadata = request_body.get("history_metadata", {})
    logging.debug("History Metadata: %s", history_metadata)

    async def generate():
        async for completionChunk in response:
            yield format_stream_response(completionChunk, history_metadata)

    return generate()


async def conversation_internal(request_body):
    logging.debug("RequestBody: %s", request_body)
    try:
        if SHOULD_STREAM:
            result = await stream_chat_request(request_body)
            response = await make_response(format_as_ndjson(result))
            response.timeout = None
            response.mimetype = "application/json-lines"
            return response
        else:
            result = await complete_chat_request(request_body)
            return jsonify(result)

    except Exception as ex:
        logging.exception(ex)
        if hasattr(ex, "status_code"):
            return jsonify({"error": str(ex)}), ex.status_code
        else:
            return jsonify({"error": str(ex)}), 500

@bp.route("/frontend_settings", methods=["GET"])
def get_frontend_settings():
    try:
        return jsonify(frontend_settings), 200
    except KeyError as e:
        logging.exception("KeyError in /frontend_settings")
        return jsonify({"error": f"Key not found: {str(e)}"}), 400
    except TypeError as e:
        logging.exception("TypeError in /frontend_settings")
        return jsonify({"error": f"Type error: {str(e)}"}), 400
    except Exception as e:
        logging.exception("Exception in /frontend_settings")
        return jsonify({"error": "An unexpected error occurred"}), 500

@bp.route("/conversation", methods=["POST"])
async def conversation():
    if 'file' not in await request.files:
        return jsonify({"error": "No file part"}), 400

    file = await request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # ファイルを保存する処理をここに追加
    file.save(os.path.join('/path/to/save', file.filename))

    # その他のデータを処理
    request_json = await request.form['messages']
    messages = json.loads(request_json)
    gptModel = await request.form['gptModel']

    # チャットリクエストを処理
    result = await stream_chat_request({
        "messages": messages,
        "gptModel": gptModel,
        "file": file
    })

    response = await make_response(format_as_ndjson(result))
    response.timeout = None
    response.mimetype = "application/json-lines"
    return response

## Conversation History API ##

@bp.route("/history/generate", methods=["POST"])
async def add_conversation():
    
    user_id = get_userid(request_headers=request.headers)
    # check request for conversation_id
    try:
        form_data = await request.form
        logging.info("form_data: %s", form_data)
        logging.info("messages: %s", form_data.get('messages'))
        logging.info("gptModel: %s", form_data.get('gptModel'))
        try:
            files = await request.files
            file = files.get('file')
            logging.info("file: %s", file)
            logging.info("files: %s", files)
        except Exception as e:
            logging.exception("Exception in /history/generate")
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.exception("Exception in /history/generate")
        return jsonify({"error": str(e)}), 500

    conversation_id = form_data.get("conversation_id", None)
    try:
        # make sure cosmos is configured
        cosmos_conversation_client = init_conversation_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        # check for the conversation_id, if the conversation is not set, we will create a new one
        history_metadata = {}
        messages = json.loads(form_data.get("messages"))
        gptModel = form_data.get("gptModel")
        file = form_data.get("file")

        if not conversation_id:
            title = await generate_title(messages)
            conversation_dict = await cosmos_conversation_client.create_conversation(
                user_id=user_id, title=title
            )
            conversation_id = conversation_dict["id"]
            history_metadata["title"] = title
            history_metadata["date"] = conversation_dict["createdAt"]

        if file:
            file.save(os.path.join('/path/to/save', file.filename))

        token = form_data.get("token", 0)
        if len(messages) > 0 and messages[-1]["role"] == "user":
            createdMessageValue = await cosmos_conversation_client.create_message(
                uuid=str(uuid.uuid4()),
                conversation_id=conversation_id,
                user_id=user_id,
                input_message=messages[-1],
                token=token
            )
            if createdMessageValue == "Conversation not found":
                raise Exception(
                    "Conversation not found for the given conversation ID: "
                    + conversation_id
                    + "."
                )
        else:
            raise Exception("No user message found")

        await cosmos_conversation_client.cosmosdb_client.close()
        history_metadata["conversation_id"] = conversation_id
        request_body = {
            "messages": messages,
            "gptModel": gptModel,
            "file": file,
            "history_metadata": history_metadata
        }
        return await conversation_internal(request_body)

    except Exception as e:
        logging.exception("Exception in /history/generate")
        return jsonify({"error": str(e)}), 500


@bp.route("/history/update", methods=["POST"])
async def update_conversation():
    
    user_id = get_userid(request_headers=request.headers)

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    try:
        # make sure cosmos is configured
        cosmos_conversation_client = init_conversation_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        # check for the conversation_id, if the conversation is not set, we will create a new one
        if not conversation_id:
            raise Exception("No conversation_id found")

        # Format the incoming message object in the "chat/completions" messages format
        # then write it to the conversation history in cosmos
        messages = request_json["messages"]
        logging.debug("Received request_json: %s", request_json)
        token = request_json.get("token", 0)
        if len(messages) > 0 and messages[-1]["role"] == "assistant":
            if len(messages) > 1 and messages[-2].get("role", None) == "tool":
                # write the tool message first
                await cosmos_conversation_client.create_message(
                    uuid=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    user_id=user_id,
                    input_message=messages[-2],
                    token=token
                )
            # write the assistant message
            await cosmos_conversation_client.create_message(
                uuid=messages[-1]["id"],
                conversation_id=conversation_id,
                user_id=user_id,
                input_message=messages[-1],
                token=token
            )
        else:
            raise Exception("No bot messages found")

        # Submit request to Chat Completions for response
        await cosmos_conversation_client.cosmosdb_client.close()
        response = {"success": True}
        return jsonify(response), 200

    except Exception as e:
        logging.exception("Exception in /history/update")
        return jsonify({"error": str(e)}), 500


@bp.route("/history/message_feedback", methods=["POST"])
async def update_message():
    
    user_id = get_userid(request_headers=request.headers)
    cosmos_conversation_client = init_conversation_cosmosdb_client()

    # check request for message_id
    request_json = await request.get_json()
    message_id = request_json.get("message_id", None)
    message_feedback = request_json.get("message_feedback", None)
    try:
        if not message_id:
            return jsonify({"error": "message_id is required"}), 400

        if not message_feedback:
            return jsonify({"error": "message_feedback is required"}), 400

        # update the message in cosmos
        updated_message = await cosmos_conversation_client.update_message_feedback(
            user_id, message_id, message_feedback
        )
        if updated_message:
            return (
                jsonify(
                    {
                        "message": f"Successfully updated message with feedback {message_feedback}",
                        "message_id": message_id,
                    }
                ),
                200,
            )
        else:
            return (
                jsonify(
                    {
                        "error": f"Unable to update message {message_id}. It either does not exist or the user does not have access to it."
                    }
                ),
                404,
            )

    except Exception as e:
        logging.exception("Exception in /history/message_feedback")
        return jsonify({"error": str(e)}), 500


@bp.route("/history/delete", methods=["DELETE"])
async def delete_conversation():
    # get the user id from the request headers
    
    user_id = get_userid(request_headers=request.headers)

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    try:
        if not conversation_id:
            return jsonify({"error": "conversation_id is required"}), 400

        # make sure cosmos is configured
        cosmos_conversation_client = init_conversation_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDB is not configured or not working")

        # delete the conversation messages from cosmos first
        deleted_messages = await cosmos_conversation_client.delete_messages(
            conversation_id, user_id
        )

        # Now delete the conversation
        deleted_conversation = await cosmos_conversation_client.delete_conversation(
            user_id, conversation_id
        )

        await cosmos_conversation_client.cosmosdb_client.close()

        return (
            jsonify(
                {
                    "message": "Successfully deleted conversation and messages",
                    "conversation_id": conversation_id,
                }
            ),
            200,
        )
    except Exception as e:
        logging.exception("Exception in /history/delete")
        return jsonify({"error": str(e)}), 500


@bp.route("/history/list", methods=["GET"])
async def list_conversations():
    offset = request.args.get("offset", 0)
    logging.info("ヘッダー、offset: %s", (request.headers, offset))
    
    user_id = get_userid(request_headers=request.headers)
    logging.info("ユーザーID: %s", user_id)
    # make sure cosmos is configured
    cosmos_conversation_client = init_conversation_cosmosdb_client()
    if not cosmos_conversation_client:
        raise Exception("CosmosDB is not configured or not working")

    # get the conversations from cosmos
    conversations = await cosmos_conversation_client.get_conversations(
        user_id, offset=offset, limit=25
    )
    await cosmos_conversation_client.cosmosdb_client.close()
    if not isinstance(conversations, list):
        return jsonify({"error": f"No conversations for {user_id} were found"}), 404

    # return the conversation ids

    return jsonify(conversations), 200


@bp.route("/history/read", methods=["POST"])
async def get_conversation():
    
    user_id = get_userid(request_headers=request.headers)
    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    if not conversation_id:
        return jsonify({"error": "conversation_id is required"}), 400

    # make sure cosmos is configured
    cosmos_conversation_client = init_conversation_cosmosdb_client()
    if not cosmos_conversation_client:
        raise Exception("CosmosDB is not configured or not working")

    # get the conversation object and the related messages from cosmos
    conversation = await cosmos_conversation_client.get_conversation(
        user_id, conversation_id
    )
    # return the conversation id and the messages in the bot frontend format
    if not conversation:
        return (
            jsonify(
                {
                    "error": f"Conversation {conversation_id} was not found. It either does not exist or the logged in user does not have access to it."
                }
            ),
            404,
        )

    # get the messages for the conversation from cosmos
    conversation_messages = await cosmos_conversation_client.get_messages(
        user_id, conversation_id
    )

    # format the messages in the bot frontend format
    messages = [
        {
            "id": msg["id"],
            "role": msg["role"],
            "content": msg["content"],
            "createdAt": msg["createdAt"],
            "feedback": msg.get("feedback"),
        }
        for msg in conversation_messages
    ]

    await cosmos_conversation_client.cosmosdb_client.close()
    return jsonify({"conversation_id": conversation_id, "messages": messages}), 200


@bp.route("/history/rename", methods=["POST"])
async def rename_conversation():
    
    user_id = get_userid(request_headers=request.headers)

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    if not conversation_id:
        return jsonify({"error": "conversation_id is required"}), 400

    # make sure cosmos is configured
    cosmos_conversation_client = init_conversation_cosmosdb_client()
    if not cosmos_conversation_client:
        raise Exception("CosmosDB is not configured or not working")

    # get the conversation from cosmos
    conversation = await cosmos_conversation_client.get_conversation(
        user_id, conversation_id
    )
    if not conversation:
        return (
            jsonify(
                {
                    "error": f"会話 {conversation_id} が見つかりませんでした。存在しないか、ログインしているユーザーがアクセス権を持っていない可能性があります。"
                }
            ),
            404,
        )

    # update the title
    title = request_json.get("title", None)
    if not title:
        return jsonify({"error": "title is required"}), 400
    conversation["title"] = title
    updated_conversation = await cosmos_conversation_client.upsert_conversation(
        conversation
    )

    await cosmos_conversation_client.cosmosdb_client.close()
    return jsonify(updated_conversation), 200


@bp.route("/history/delete_all", methods=["DELETE"])
async def delete_all_conversations():
    # get the user id from the request headers
    
    user_id = get_userid(request_headers=request.headers)

    # get conversations for user
    try:
        # make sure cosmos is configured
        cosmos_conversation_client = init_conversation_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDBが構成されていないか、動作していません")

        conversations = await cosmos_conversation_client.get_conversations(
            user_id, offset=0, limit=None
        )
        if not conversations:
            return jsonify({"error": f"{user_id} の会話が見つかりませんでした"}), 404

        # delete each conversation
        for conversation in conversations:
            # delete the conversation messages from cosmos first
            deleted_messages = await cosmos_conversation_client.delete_messages(
                conversation["id"], user_id
            )

            # Now delete the conversation
            deleted_conversation = await cosmos_conversation_client.delete_conversation(
                user_id, conversation["id"]
            )
        await cosmos_conversation_client.cosmosdb_client.close()
        return (
            jsonify(
                {
                    "message": f"ユーザー {user_id} の会話とメッセージを正常に削除しました"
                }
            ),
            200,
        )

    except Exception as e:
        logging.exception("Exception in /history/delete_all")
        return jsonify({"error": f"エラーが発生しました: {str(e)}"}), 500

@bp.route("/history/clear", methods=["POST"])
async def clear_messages():
    # get the user id from the request headers
    
    user_id = get_userid(request_headers=request.headers)

    # check request for conversation_id
    request_json = await request.get_json()
    conversation_id = request_json.get("conversation_id", None)

    try:
        if not conversation_id:
            return jsonify({"error": "conversation_idは必須です"}), 400

        # make sure cosmos is configured
        cosmos_conversation_client = init_conversation_cosmosdb_client()
        if not cosmos_conversation_client:
            raise Exception("CosmosDBが構成されていないか、動作していません")

        # delete the conversation messages from cosmos
        deleted_messages = await cosmos_conversation_client.delete_messages(
            conversation_id, user_id
        )

        return (
            jsonify(
                {
                    "message": "会話内のメッセージを正常に削除しました",
                    "conversation_id": conversation_id,
                }
            ),
            200,
        )
    except Exception as e:
        logging.exception("Exception in /history/clear_messages")
        return jsonify({"error": f"エラーが発生しました: {str(e)}"}), 500
@bp.route("/history/ensure", methods=["GET"])
async def ensure_cosmos():
    if not AZURE_COSMOSDB_ACCOUNT:
        return jsonify({"error": "CosmosDBが構成されていません"}), 404
    
    try:    
        cosmos_conversation_client = init_conversation_cosmosdb_client()
        success, err = await cosmos_conversation_client.ensure()
        if not cosmos_conversation_client or not success:
            if err:
                return jsonify({"error": err}), 422
            return jsonify({"error": "CosmosDBが構成されていないか、動作していません"}), 500

        await cosmos_conversation_client.cosmosdb_client.close()
        return jsonify({"message": "CosmosDBは構成されており、動作しています"}), 200
    except Exception as e:
        logging.exception("Exception in /history/ensure")
        cosmos_exception = str(e)
        if "Invalid credentials" in cosmos_exception:
            return jsonify({"error": cosmos_exception}), 401
        elif "Invalid CosmosDB database name" in cosmos_exception:
            return (
                jsonify(
                    {
                        "error": f"{cosmos_exception} アカウント {AZURE_COSMOSDB_ACCOUNT} のデータベース {AZURE_COSMOSDB_DATABASE}"
                    }
                ),
                422,
            )
        elif "Invalid CosmosDB container name" in cosmos_exception:
            return (
                jsonify(
                    {
                        "error": f"{cosmos_exception}: コンテナ {AZURE_COSMOSDB_CONVERSATIONS_CONTAINER}"
                    }
                ),
                422,
            )
        else:
            return jsonify({"error": "CosmosDBが動作していません"}), 500
## Prompt API ##
@bp.route("/prompt/get_prompts", methods=["GET"])
async def get_prompts():
    try:
        cosmos_prompt_client = init_prompt_cosmosdb_client()
        if not cosmos_prompt_client:
            raise Exception("CosmosDBが設定されていないか、動作していません")

        # CosmosDBからプロンプトを取得
        prompts = await cosmos_prompt_client.get_prompts()
        await cosmos_prompt_client.cosmosdb_client.close()

        return jsonify(prompts), 200
    except Exception as e:
        logging.exception("Exception in /get_prompt")
        return jsonify({"error": str(e)}), 500


@bp.route("/prompt/add", methods=["POST"])
async def add_prompt():
    request_json = await request.get_json()
    prompt = request_json.get("prompt", None)
    user_name = request_json.get("user_name", "anounimous")
    tags = request_json.get("tags", None)
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    try:
        try:
            cosmos_prompt_client = init_prompt_cosmosdb_client()
            if not cosmos_prompt_client:
                raise Exception("CosmosDBが設定されていないか、動作していません")

            await cosmos_prompt_client.create_prompt(user_name, prompt, tags)

            await cosmos_prompt_client.cosmosdb_client.close()

            return jsonify({"message": "プロンプトが正常に追加されました"}), 200
        except Exception as e:
            logging.exception("プロンプトの追加中にエラーが発生しました")
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.exception("Exception in /add_prompt")
        return jsonify({"error": str(e)}), 500

## Auth API ##
@bp.route("/auth/verify", methods=["POST"])
async def verify_user():
    try:
        await verify_email(request_headers=request.headers)
        return jsonify({"message": "Email verification link sent"}), 200
    except AuthError as e:
        logging.exception("AuthError in verify_user")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.exception("Exception in verify_user")
        return jsonify({"error": str(e)}), 500


@bp.route('/usermgmt', methods=['GET'])
def user_mgmt():
    mode = request.args.get('mode')
    action_code = request.args.get('oobCode')
    continue_url = request.args.get('continueUrl')
    lang = request.args.get('lang', 'en')

    if mode == 'resetPassword':
        return handle_reset_password(action_code, continue_url, lang)
    elif mode == 'recoverEmail':
        return handle_recover_email(action_code, lang)
    elif mode == 'verifyEmail':
        return handle_verify_email(action_code, continue_url, lang)
    else:
        return "Error: invalid mode"

@bp.route('/auth/create_user', methods=['POST'])
async def create_user():
    request_json = await request.get_json()
    email = request_json.get("email", None)
    password = request_json.get("password", None)
    response, status_code = create_user_and_send_verification(email, password)
    return jsonify(response), status_code

@bp.route('/confirm_reset_password', methods=['POST'])
def confirm_reset_password():
    return confirm_password_reset(request.form['action_code'], request.form['new_password'])

@bp.route('/auth/me', methods=['GET'])
async def get_user_info():
    try:
        user_object = get_authenticated_user_details(request_headers=request.headers)
        logging.info("User Object: ", user_object)
        return jsonify({
            "user_principal_id": user_object["user_principal_id"],
            "email": user_object["email"],
            "display_name": user_object["display_name"],
        }), 200
    except AuthError as e:
        logging.exception("AuthError in get_user_info")
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        logging.exception("Exception in get_user_info")
        return jsonify({"error": str(e)}), 500

@bp.route('/auth/set_custom_claims', methods=['POST'])
async def set_custom_claims_route():
    try:
        await set_custom_claims(request_headers=request.headers)
        return jsonify({"message": "Custom claims set successfully"}), 200
    except AuthError as e:
        logging.exception("AuthError in set_custom_claims_route")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.exception("Exception in set_custom_claims_route")
        return jsonify({"error": str(e)}), 500


@bp.route('/users', methods=['GET'])
async def users():
    try:
        users = fetch_users()
        return jsonify(users), 200
    except AuthError as e:
        logging.exception("AuthError in users")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.exception("Exception in users")
        return jsonify({"error": str(e)}), 500


##タイトル生成用関数##
async def generate_title(conversation_messages):
    # make sure the messages are sorted by _ts descending
    title_prompt = 'Summarize the conversation so far into a 4-word or less title. Do not use any quotation marks or punctuation. Respond with a json object in the format {{"title": string}}. Do not include any other commentary or description.'

    messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in conversation_messages
    ]
    messages.append({"role": "user", "content": title_prompt})

    try:
        azure_openai_client = init_openai_client(use_data=False)
        response = await azure_openai_client.chat.completions.create(
            model=AZURE_OPENAI_GPT35_TURBO_16K_MODEL, messages=messages, temperature=1, max_tokens=64
        )

        title = json.loads(response.choices[0].message.content)["title"]
        return title
    except Exception as e:
        return messages[-2]["content"]


app = create_app()
