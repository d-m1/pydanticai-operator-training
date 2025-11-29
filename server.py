from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from openai import AsyncAzureOpenAI
from config import settings
import logging
from typing import Dict, Optional
from uuid import uuid4

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Matrix Chat Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

azure_client = AsyncAzureOpenAI(
    azure_endpoint=settings.azure_openai_endpoint,
    api_version=settings.azure_openai_api_version,
    api_key=settings.azure_openai_api_key,
)

model = OpenAIChatModel(
    settings.azure_openai_deployment_name,
    provider=OpenAIProvider(openai_client=azure_client),
)

agent = Agent(
    model,
    system_prompt=(
        "You are an AI entity within the Matrix. "
        "Respond with a mysterious, philosophical tone reminiscent of Morpheus or the Oracle. "
        "Keep responses concise but meaningful. "
        "Occasionally reference the nature of reality, choice, and awakening."
    ),
)

message_histories: Dict[str, list] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    tokens_used: Optional[dict] = None


@app.get("/")
async def root():
    return {"status": "online", "message": "Matrix chat server is running"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    session_id = request.session_id or str(uuid4())
    history = message_histories.get(session_id, [])
    
    logger.info(f"=== Session {session_id[:8]} ===")
    logger.info(f"Request session_id: {request.session_id}")
    logger.info(f"Using session_id: {session_id[:8]}")
    logger.info(f"History length: {len(history)} messages")
    logger.info(f"User message: {request.message[:50]}...")
    
    if history:
        logger.info(f"Previous messages in history:")
        for i, msg in enumerate(history):
            msg_type = type(msg).__name__
            logger.info(f"  [{i}] {msg_type}")
    else:
        logger.info("No previous history - new session")
    
    try:
        result = await agent.run(request.message, message_history=history)
        new_messages = result.all_messages()
        message_histories[session_id] = new_messages
        
        logger.info(f"Stored {len(new_messages)} messages in history for session {session_id[:8]}")
        
        usage = result.usage()
        logger.info(
            f"Session {session_id[:8]} completed: "
            f"Input tokens: {usage.input_tokens}, "
            f"Output tokens: {usage.output_tokens}, "
            f"Total: {usage.total_tokens}"
        )
        logger.info(f"Active sessions in memory: {len(message_histories)}")
        logger.info("=" * 50)
        
        return ChatResponse(
            response=result.output,
            session_id=session_id,
            tokens_used={
                "input_tokens": usage.input_tokens,
                "output_tokens": usage.output_tokens,
                "total_tokens": usage.total_tokens,
            }
        )
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get AI response: {str(e)}"
        )


# @app.websocket("/chat/stream")
# async def chat_stream(websocket: WebSocket):
#     await websocket.accept()
#     session_id = None
    
#     try:
#         while True:
#             data = await websocket.receive_json()
#             message = data.get("message", "").strip()
#             session_id = data.get("session_id") or str(uuid4())
            
#             if not message:
#                 await websocket.send_json({"error": "Message cannot be empty"})
#                 continue
            
#             history = message_histories.get(session_id, [])
            
#             await websocket.send_json({
#                 "type": "session",
#                 "session_id": session_id
#             })
            
#             async with agent.run_stream(message, message_history=history) as run:
#                 async for text in run.stream_text():
#                     await websocket.send_json({
#                         "type": "token",
#                         "content": text
#                     })
            
#             result = await run.get_result()
#             message_histories[session_id] = result.all_messages()
            
#             usage = result.usage()
#             await websocket.send_json({
#                 "type": "done",
#                 "tokens_used": {
#                     "input_tokens": usage.input_tokens,
#                     "output_tokens": usage.output_tokens,
#                     "total_tokens": usage.total_tokens,
#                 }
#             })
            
#             logger.info(f"Stream session {session_id[:8]}: Total tokens: {usage.total_tokens}")
    
#     except WebSocketDisconnect:
#         logger.info(f"WebSocket disconnected: {session_id[:8] if session_id else 'unknown'}")
#     except Exception as e:
#         logger.error(f"WebSocket error: {e}")
#         try:
#             await websocket.send_json({"type": "error", "message": str(e)})
#         except:
#             pass


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "active_sessions": len(message_histories),
        "model": settings.azure_openai_deployment_name
    }


@app.post("/session/{session_id}/clear")
async def clear_session(session_id: str):
    if session_id in message_histories:
        del message_histories[session_id]
        return {"message": "Session cleared", "session_id": session_id}
    return {"message": "Session not found", "session_id": session_id}


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Matrix Chat Server on {settings.host}:{settings.port}")
    logger.info(f"Using model: {settings.azure_openai_deployment_name}")
    uvicorn.run(app, host=settings.host, port=settings.port)
