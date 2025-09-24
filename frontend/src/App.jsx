// import React, { useState, useRef, useEffect } from 'react';
// import './App.css';

// const API_BASE = 'http://localhost:8000';

// function App() {
//   const [step, setStep] = useState('upload'); // upload, interview, result
//   const [sessionId, setSessionId] = useState(null);
//   const [questions, setQuestions] = useState([]);
//   const [currentQuestion, setCurrentQuestion] = useState(0);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [evaluation, setEvaluation] = useState(null);
//   const [finalResult, setFinalResult] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const fileInputRef = useRef(null);
//   const mediaRecorderRef = useRef(null);
//   const audioChunksRef = useRef([]);
//   const audioPlayerRef = useRef(null);

//   // Upload Resume
//   const handleFileUpload = async (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     setLoading(true);
//     setError('');

//     const formData = new FormData();
//     formData.append('file', file);

//     try {
//       const response = await fetch(`${API_BASE}/upload-resume`, {
//         method: 'POST',
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error('Failed to upload resume');
//       }

//       const data = await response.json();
//       setSessionId(data.session_id);
//       setQuestions(data.questions);
//       setStep('interview');
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Play Question Audio
//   const playQuestion = async () => {
//     if (!sessionId) return;

//     setIsPlaying(true);
//     setError('');

//     try {
//       const response = await fetch(
//         `${API_BASE}/question/${sessionId}/${currentQuestion}`
//       );

//       if (!response.ok) {
//         throw new Error('Failed to get question audio');
//       }

//       const audioBlob = await response.blob();
//       const audioUrl = URL.createObjectURL(audioBlob);
      
//       if (audioPlayerRef.current) {
//         audioPlayerRef.current.src = audioUrl;
//         audioPlayerRef.current.onended = () => setIsPlaying(false);
//         await audioPlayerRef.current.play();
//       }
//     } catch (err) {
//       setError(err.message);
//       setIsPlaying(false);
//     }
//   };

//   // Start Recording
//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         audioChunksRef.current.push(event.data);
//       };

//       mediaRecorderRef.current.onstop = async () => {
//         const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
//         await submitAnswer(audioBlob);
//         stream.getTracks().forEach(track => track.stop());
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (err) {
//       setError('Failed to access microphone');
//     }
//   };

//   // Stop Recording
//   const stopRecording = () => {
//     if (mediaRecorderRef.current && isRecording) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//     }
//   };

//   // Submit Answer
//   const submitAnswer = async (audioBlob) => {
//     setLoading(true);
//     setError('');

//     const formData = new FormData();
//     formData.append('audio_file', audioBlob, 'answer.wav');

//     try {
//       const response = await fetch(
//         `${API_BASE}/submit-answer/${sessionId}/${currentQuestion}`,
//         {
//           method: 'POST',
//           body: formData,
//         }
//       );

//       if (!response.ok) {
//         throw new Error('Failed to submit answer');
//       }

//       const data = await response.json();
//       setEvaluation(data);

//       // Auto-advance after showing evaluation
//       setTimeout(() => {
//         if (currentQuestion < questions.length - 1) {
//           setCurrentQuestion(currentQuestion + 1);
//           setEvaluation(null);
//         } else {
//           // Interview complete
//           getFinalResult();
//         }
//       }, 3000);

//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Get Final Result
//   const getFinalResult = async () => {
//     try {
//       const response = await fetch(`${API_BASE}/session/${sessionId}/result`);
//       if (!response.ok) {
//         throw new Error('Failed to get results');
//       }
//       const data = await response.json();
//       setFinalResult(data);
//       setStep('result');
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   // Restart Interview
//   const restartInterview = () => {
//     setStep('upload');
//     setSessionId(null);
//     setQuestions([]);
//     setCurrentQuestion(0);
//     setEvaluation(null);
//     setFinalResult(null);
//     setError('');
//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//   };

//   return (
//     <div className="App">
//       <div className="container">
//         <h1>🤖 AI Interview Assistant</h1>

//         {error && (
//           <div className="error">
//             <p>{error}</p>
//           </div>
//         )}

//         {step === 'upload' && (
//           <div className="upload-section">
//             <div className="upload-card">
//               <h2>Upload Your Resume</h2>
//               <p>Upload your PDF resume to start the AI interview</p>
              
//               <div className="upload-area">
//                 <input
//                   type="file"
//                   accept=".pdf"
//                   onChange={handleFileUpload}
//                   ref={fileInputRef}
//                   disabled={loading}
//                 />
//                 <div className="upload-text">
//                   {loading ? 'Processing resume...' : 'Click to select PDF resume'}
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {step === 'interview' && (
//           <div className="interview-section">
//             <div className="progress-bar">
//               <div 
//                 className="progress-fill"
//                 style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
//               ></div>
//             </div>
            
//             <div className="question-card">
//               <h2>Question {currentQuestion + 1} of {questions.length}</h2>
//               <div className="question-text">
//                 {questions[currentQuestion]}
//               </div>
              
//               <div className="audio-controls">
//                 <button 
//                   onClick={playQuestion}
//                   disabled={isPlaying || loading}
//                   className="btn btn-secondary"
//                 >
//                   {isPlaying ? '🔊 Playing...' : '🔊 Listen to Question'}
//                 </button>
                
//                 <audio ref={audioPlayerRef} />
//               </div>

//               <div className="recording-controls">
//                 {!isRecording ? (
//                   <button 
//                     onClick={startRecording}
//                     disabled={loading}
//                     className="btn btn-primary record-btn"
//                   >
//                     🎤 Start Recording Answer
//                   </button>
//                 ) : (
//                   <button 
//                     onClick={stopRecording}
//                     className="btn btn-danger record-btn recording"
//                   >
//                     ⏹ Stop Recording
//                   </button>
//                 )}
//               </div>

//               {isRecording && (
//                 <div className="recording-indicator">
//                   <div className="pulse"></div>
//                   Recording... Speak clearly in English or Hinglish
//                 </div>
//               )}

//               {loading && (
//                 <div className="loading">
//                   <div className="spinner"></div>
//                   Evaluating your answer...
//                 </div>
//               )}
//             </div>

//             {evaluation && (
//               <div className="evaluation-card">
//                 <h3>Answer Evaluation</h3>
//                 <div className="scores">
//                   <div className="score-item">
//                     <span className="label">Score:</span>
//                     <span className="value">{evaluation.marks}/5</span>
//                   </div>
//                   <div className="score-item">
//                     <span className="label">Confidence:</span>
//                     <span className="value">{evaluation.confidence}%</span>
//                   </div>
//                   <div className="score-item">
//                     <span className="label">Pitch:</span>
//                     <span className="value">{evaluation.pitch}%</span>
//                   </div>
//                 </div>
//                 {evaluation.transcribed_text && (
//                   <div className="transcription">
//                     <strong>What you said:</strong>
//                     <p>"{evaluation.transcribed_text}"</p>
//                   </div>
//                 )}
//                 <p className="next-question">Moving to next question...</p>
//               </div>
//             )}
//           </div>
//         )}

//         {step === 'result' && finalResult && (
//           <div className="result-section">
//             <div className="result-card">
//               <h2>Interview Complete! 🎉</h2>
              
//               <div className={`result-status ${finalResult.result.toLowerCase()}`}>
//                 <h3>{finalResult.result}</h3>
//               </div>
              
//               <div className="final-scores">
//                 <div className="score-large">
//                   <span className="score-number">{finalResult.total_score}</span>
//                   <span className="score-total">/ {finalResult.max_score}</span>
//                 </div>
//                 <div className="percentage">
//                   {Math.round(finalResult.percentage)}%
//                 </div>
//               </div>

//               <div className="questions-summary">
//                 <h4>Questions Asked:</h4>
//                 <ol>
//                   {finalResult.questions.map((question, index) => (
//                     <li key={index}>{question}</li>
//                   ))}
//                 </ol>
//               </div>

//               <button 
//                 onClick={restartInterview}
//                 className="btn btn-primary"
//               >
//                 Start New Interview
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default App;








import React, { useState, useRef } from 'react';
import './App.css';

// const API_BASE = 'http://localhost:8000';
const API_BASE = 'https://render-xrji.onrender.com';

function App() {
  const [step, setStep] = useState('upload'); // upload, interview, result
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [finalResult, setFinalResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  // Upload Resume
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/upload-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload resume');

      const data = await response.json();
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setStep('interview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Play Question Audio
  // const playQuestion = async () => {
  //   if (!sessionId) return;

  //   setIsPlaying(true);
  //   setError('');

  //   try {
  //     const response = await fetch(`${API_BASE}/question/${sessionId}/${currentQuestion}`);
  //     if (!response.ok) throw new Error('Failed to get question audio');

  //     const audioBlob = await response.blob();
  //     const audioUrl = URL.createObjectURL(audioBlob);

  //     if (audioPlayerRef.current) {
  //       audioPlayerRef.current.src = audioUrl;
  //       audioPlayerRef.current.onended = () => setIsPlaying(false);
  //       await audioPlayerRef.current.play();
  //     }
  //   } catch (err) {
  //     setError(err.message);
  //     setIsPlaying(false);
  //   }
  // };
// Play Question Audio
  const playQuestion = async () => {
    if (!sessionId) return;

    setIsPlaying(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/question/${sessionId}/${currentQuestion}`,
        {
          method: "GET",
          headers: {
            "Accept": "audio/mpeg",
          },
          cache: "no-store", // prevent stale audio caching
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to get question audio");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.onended = () => setIsPlaying(false);
        await audioPlayerRef.current.play();
      }
    } catch (err) {
      setError(err.message);
      setIsPlaying(false);
    }
  };

  // Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await submitAnswer(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      setError('Failed to access microphone');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit Answer
  const submitAnswer = async (audioBlob) => {
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'answer.wav');

    try {
      const response = await fetch(`${API_BASE}/submit-answer/${sessionId}/${currentQuestion}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to submit answer');

      const data = await response.json();
      setEvaluation(data);
      setAllEvaluations(prev => [...prev, { question: questions[currentQuestion], ...data }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Next Question
  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setEvaluation(null);
    } else {
      getFinalResult();
    }
  };

  // Get Final Result
  const getFinalResult = async () => {
    try {
      const response = await fetch(`${API_BASE}/session/${sessionId}/result`);
      if (!response.ok) throw new Error('Failed to get results');
      const data = await response.json();
      setFinalResult(data);
      setStep('result');
    } catch (err) {
      setError(err.message);
    }
  };

  // Restart Interview
  const restartInterview = () => {
    setStep('upload');
    setSessionId(null);
    setQuestions([]);
    setCurrentQuestion(0);
    setEvaluation(null);
    setAllEvaluations([]);
    setFinalResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="App">
      <div className="container">
        <h1>🤖 AI Interview Assistant</h1>

        {error && <div className="error"><p>{error}</p></div>}

        {/* Upload Section */}
        {step === 'upload' && (
          <div className="upload-section">
            <div className="upload-card">
              <h2>Upload Your Resume</h2>
              <input type="file" accept=".pdf" onChange={handleFileUpload} ref={fileInputRef} disabled={loading} />
              <p>{loading ? 'Processing resume...' : 'Upload your PDF resume to start'}</p>
            </div>
          </div>
        )}

        {/* Interview Section */}
        {step === 'interview' && (
          <div className="interview-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}></div>
            </div>

            <div className="question-card">
              <h2>Question {currentQuestion + 1} of {questions.length}</h2>
              <p>{questions[currentQuestion]}</p>

              <button onClick={playQuestion} disabled={isPlaying || loading} className="btn btn-secondary">
                {isPlaying ? '🔊 Playing...' : '🔊 Listen to Question'}
              </button>
              <audio ref={audioPlayerRef} />

              {!isRecording ? (
                <button onClick={startRecording} disabled={loading} className="btn btn-primary">
                  🎤 Start Recording
                </button>
              ) : (
                <button onClick={stopRecording} className="btn btn-danger">
                  ⏹ Stop Recording
                </button>
              )}

              {isRecording && <p>🎙️ Recording... Speak clearly</p>}
              {loading && <p>⏳ Evaluating your answer...</p>}
            </div>

            {/* Evaluation Feedback */}
            {evaluation && (
              <div className="evaluation-card">
                <h3>Answer Evaluation</h3>
                <p><strong>Score:</strong> {evaluation.marks}/5</p>
                <p><strong>Confidence:</strong> {evaluation.confidence}%</p>
                <p><strong>Pitch:</strong> {evaluation.pitch}%</p>
                {evaluation.transcribed_text && <p><strong>What you said:</strong> "{evaluation.transcribed_text}"</p>}
                {evaluation.feedback && <p><strong>Feedback:</strong> {evaluation.feedback}</p>}

                <button onClick={nextQuestion} className="btn btn-primary">
                  {currentQuestion < questions.length - 1 ? 'Next Question ➡️' : 'See Final Result 🎯'}
                </button>
              </div>
            )}

            {/* Show previous evaluations */}
            {allEvaluations.length > 0 && (
              <div className="previous-feedback">
                <h4>Previous Answers</h4>
                <ul>
                  {allEvaluations.map((ev, idx) => (
                    <li key={idx}>
                      <strong>Q{idx + 1}:</strong> {ev.question} → Score {ev.marks}/5 | {ev.feedback || 'No feedback'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Result Section */}
        {step === 'result' && finalResult && (
          <div className="result-section">
            <h2>Interview Complete! 🎉</h2>
            <p>Status: {finalResult.result}</p>
            <p>Total Score: {finalResult.total_score} / {finalResult.max_score}</p>
            <p>Percentage: {Math.round(finalResult.percentage)}%</p>

            <h4>All Questions</h4>
            <ol>
              {finalResult.questions.map((q, i) => <li key={i}>{q}</li>)}
            </ol>

            <button onClick={restartInterview} className="btn btn-primary">Start New Interview</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
