from urllib import response
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import fitz  # PyMuPDF
import google.generativeai as genai
import pytesseract
from PIL import Image
import os, json, uuid
import soundfile as sf
from gtts import gTTS
import numpy as np
from pydantic import BaseModel
from typing import List, Optional
import tempfile
import shutil

app = FastAPI(title="AI Interview API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_all_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
genai.configure(api_key="AIzaSyDtAd15HFZpTpY9RlBSAo7ab4JkgpLDNr8")  # Replace with your API key
model = genai.GenerativeModel("gemini-2.5-flash")

# Directories
AUDIO_DIR = "interview_recordings"
RESUME_DIR = "resumes"
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(RESUME_DIR, exist_ok=True)

# Models
class InterviewSession(BaseModel):
    session_id: str
    resume_text: str
    questions: List[str]
    current_question: int = 0
    total_score: int = 0

class QuestionResponse(BaseModel):
    score: int
    confidence_score: int
    pitch_score: int
    transcribed_text: str

class EvaluationResult(BaseModel):
    marks: int
    confidence: int
    pitch: int
    transcribed_text: str
    need_followup: bool
    followup_question: Optional[str] = None

# In-memory session storage (use Redis in production)
sessions = {}

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF with OCR fallback"""
    doc = fitz.open(pdf_path)
    all_text = ""

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        if text.strip():
            all_text += f"\n--- Page {page_num} ---\n{text}\n"
        else:
            print(f"Page {page_num} using OCR...")
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img, lang="eng")
            all_text += f"\n--- Page {page_num} (OCR) ---\n{ocr_text}\n"
    
    doc.close()
    return all_text.strip()

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload and process resume PDF"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Save uploaded file
    session_id = str(uuid.uuid4())
    file_path = os.path.join(RESUME_DIR, f"{session_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Extract text from PDF
        resume_text = extract_text_from_pdf(file_path)
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Generate questions using Gemini
        first_prompt = f"""
        You are an interviewer. 
        Using the provided resume, create exactly 5 targeted interview questions 
        that directly relate to the candidate's specific skills, professional 
        experience, or projects listed. Ensure each question is concise, relevant, 
        and designed to elicit detailed responses about the candidate's qualifications 
        and achievements.
        
        Resume:
        {resume_text}

        Respond ONLY with a numbered list of 5 unique questions in English.
        """
        
        chat = model.start_chat(history=[])
        response = chat.send_message(first_prompt)
        # questions = response.text.strip().split("\n")
        # questions = [q.strip("0123456789. ") for q in questions if q.strip()][:5]
        raw_lines = response.text.strip().split("\n")

        # Filter only lines that look like actual questions
        questions = []
        for line in raw_lines:
            clean_line = line.strip("0123456789. ").strip()
            # Skip if it's an intro line
            if "here are" in clean_line.lower() or "interview questions" in clean_line.lower():
                continue
            if len(clean_line) > 10:  # make sure it's not empty or too short
                questions.append(clean_line)

        # Ensure exactly 5 questions
        questions = questions[:5]
        
        # Create session
        session = InterviewSession(
            session_id=session_id,
            resume_text=resume_text,
            questions=questions
        )
        sessions[session_id] = {
            "data": session,
            "chat": chat
        }
        
        return {
            "session_id": session_id,
            "questions": questions,
            "total_questions": len(questions)
        }
        
    except Exception as e:
        # Clean up file on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

@app.get("/question/{session_id}/{question_index}")
async def get_question_audio(session_id: str, question_index: int):
    """Get question audio file"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = sessions[session_id]["data"]
    
    if question_index >= len(session_data.questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
    
    question = session_data.questions[question_index]
    audio_filename = f"question_{session_id}_{question_index}.mp3"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)
    
    # Generate audio if not exists
    # if not os.path.exists(audio_path):
    #     tts = gTTS(text=question, lang="en")
    #     tts.save(audio_path)
    if not os.path.exists(audio_path):
        try:
            tts = gTTS(text=question, lang="en")
            tts.save(audio_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")   
    return FileResponse(audio_path, media_type="audio/mpeg", filename=audio_filename)

@app.post("/submit-answer/{session_id}/{question_index}")
async def submit_answer(session_id: str, question_index: int, audio_file: UploadFile = File(...)):
    """Submit audio answer and get evaluation"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = sessions[session_id]["data"]
    chat = sessions[session_id]["chat"]
    
    if question_index >= len(session_data.questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
    
    # Save audio file
    audio_filename = f"answer_{session_id}_{question_index}.wav"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)
    
    with open(audio_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)
    
    try:
        question = session_data.questions[question_index]
        
        # Evaluate using Gemini
        eval_prompt = f"""
        Candidate Resume (English):
        {session_data.resume_text}

        Interview Question (English):
        {question}

        Candidate's Answer (English or Hinglish, audio attached).

        Evaluate the candidate's spoken answer (whether in English or Hinglish).
        Return JSON with:
        - score (0–5)
        - confidence_score (0–100)
        - pitch_score (0–100)
        - transcribed_text (speech transcription in English/Hinglish)
        """

        eval_response = model.generate_content([
            eval_prompt,
            {"mime_type": "audio/wav", "data": open(audio_path, "rb").read()}
        ])

        try:
            result = json.loads(eval_response.text.strip())
            marks = int(result.get("score", 0))
            confidence = result.get("confidence_score", 0)
            pitch = result.get("pitch_score", 0)
            answer_text = result.get("transcribed_text", "")
        except:
            marks, confidence, pitch, answer_text = 0, 0, 0, "Could not transcribe"

        # Update total score
        session_data.total_score += marks
        
        # Check if follow-up needed
        need_followup = marks < 3 or confidence < 60 or len(answer_text.split()) < 10
        followup_question = None
        
        if need_followup and question_index < len(session_data.questions) - 1:  # Not last question
            followup_prompt = f"""
            Candidate said (English/Hinglish): "{answer_text}"
            Original Question (English): {question}
            Resume (English): {session_data.resume_text}

            Generate ONE probing follow-up interview question in English 
            to encourage the candidate to expand or clarify.
            """
            followup_response = chat.send_message(followup_prompt)
            followup_question = followup_response.text.strip()
        
        return EvaluationResult(
            marks=marks,
            confidence=confidence,
            pitch=pitch,
            transcribed_text=answer_text,
            need_followup=need_followup,
            followup_question=followup_question
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating answer: {str(e)}")

@app.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    """Get current session status"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = sessions[session_id]["data"]
    
    return {
        "session_id": session_id,
        "current_question": session_data.current_question,
        "total_questions": len(session_data.questions),
        "total_score": session_data.total_score,
        "questions": session_data.questions
    }

@app.get("/session/{session_id}/result")
async def get_final_result(session_id: str):
    """Get final interview result"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = sessions[session_id]["data"]
    max_score = len(session_data.questions) * 5
    
    return {
        "total_score": session_data.total_score,
        "max_score": max_score,
        "percentage": (session_data.total_score / max_score) * 100,
        "result": "PASSED" if session_data.total_score >= (max_score * 0.4) else "FAILED",
        "questions": session_data.questions
    }

@app.delete("/session/{session_id}")
async def cleanup_session(session_id: str):
    """Clean up session and files"""
    if session_id in sessions:
        # Remove session files
        resume_files = [f for f in os.listdir(RESUME_DIR) if f.startswith(session_id)]
        for file in resume_files:
            os.remove(os.path.join(RESUME_DIR, file))
        
        audio_files = [f for f in os.listdir(AUDIO_DIR) if session_id in f]
        for file in audio_files:
            os.remove(os.path.join(AUDIO_DIR, file))
        
        # Remove from memory
        del sessions[session_id]
    
    return {"message": "Session cleaned up successfully"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    