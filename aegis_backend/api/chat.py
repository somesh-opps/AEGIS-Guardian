"""
POST /api/v1/chat — chatbot Q&A endpoint.
Assembles campus context + chat history and calls AI Incident Commander.
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException
from db.mongo import get_db
from db.models import ChatRequest, ChatResponse, ChatTurn
from db import repositories as repo
from ai import incident_commander

logger = logging.getLogger("aegis.chat")
router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse, summary="Ask the AEGIS chatbot")
async def chat(request: ChatRequest):
    import traceback
    try:
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        db = get_db()

        # 1. Get or create chat session
        session = await repo.get_or_create_session(db, request.session_id)

        # 2. Fetch campus context
        campus_status = await repo.get_all_building_statuses(db)

        # 3. Fetch active incident (for the hinted building or any building)
        active_incident = None
        if request.building:
            active_incident = await repo.get_active_incident(db, request.building)
        if not active_incident:
            # Find any active incident across campus
            for b in campus_status:
                if b.get("status") in ("CRITICAL", "WARNING") and b.get("active_incident"):
                    active_incident = await repo.get_incident(db, b["active_incident"])
                    break

        # 4. Get conversation history
        history = await repo.get_recent_turns(db, session.session_id)

        # 5. Call AI
        try:
            answer, source = await incident_commander.answer_question(
                question=request.question,
                campus_status=campus_status,
                active_incident=active_incident,
                chat_history=history,
            )
        except RuntimeError as e:
            logger.error(f"[CHAT] AI failed: {e}")
            raise HTTPException(status_code=503, detail=f"AI service temporarily unavailable: {e}")

        # 6. Store both turns in session
        await repo.append_chat_turn(db, session.session_id, ChatTurn(role="user",      content=request.question))
        await repo.append_chat_turn(db, session.session_id, ChatTurn(role="assistant", content=answer))

        logger.info(f"[CHAT] Session {session.session_id[:8]} — answered via {source}")
        return ChatResponse(session_id=session.session_id, answer=answer, source=source)
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"[CHAT ERROR] {tb}")
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}\n{tb}")
