'use client'

import { useState } from 'react';

export default function WardMemorizer() {
  const [mode, setMode] = useState('upload'); // 'upload', 'menu', 'quiz', 'practice'
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Quiz State
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [mistakes, setMistakes] = useState(0);

  // Practice State
  const [isFlipped, setIsFlipped] = useState(false);

  // File Upload Handler
  const handleFileUpload = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Shuffle the newly processed data and start the app
        const shuffled = [...result.data].sort(() => 0.5 - Math.random());
        setDeck(shuffled);
        setMode('menu');
      } else {
        alert("Error processing PDF: " + result.error);
      }
    } catch (err) {
      alert("Failed to connect to the server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPerson = deck[currentIndex];

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (!userInput) return;

    const guess = userInput.toLowerCase().trim();
    const preferred = currentPerson.preferred_name.toLowerCase().trim();
    const full = currentPerson.full_name.toLowerCase().trim();

    if (guess === preferred || guess === full) {
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        setUserInput('');
        advanceCard();
      }, 1000);
    } else {
      setFeedback('incorrect');
      setMistakes((prev) => prev + 1);
    }
  };

  const advanceCard = () => {
    setIsFlipped(false);
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      alert("You've finished the deck!");
      setMode('menu');
      setCurrentIndex(0);
    }
  };

  const needsPractice = () => {
    const updatedDeck = [...deck];
    const card = updatedDeck.splice(currentIndex, 1)[0];
    updatedDeck.push(card);
    setDeck(updatedDeck);
    setIsFlipped(false);
  };

  // --- UPLOAD SCREEN ---
  if (mode === 'upload') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Ward Memorizer Setup</h1>
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
          <p className="text-gray-600 mb-6">Upload the official PDF Ward Directory to generate your flashcards.</p>
          <label className="block w-full cursor-pointer bg-blue-50 text-blue-700 border-2 border-dashed border-blue-300 hover:bg-blue-100 transition p-6 rounded-lg font-semibold">
            {isProcessing ? 'Processing PDF... Please wait.' : 'Click to Upload PDF'}
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={isProcessing}
            />
          </label>
        </div>
      </div>
    );
  }

  // --- MENU SCREEN ---
  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Ward Memorizer</h1>
        <p className="text-gray-500 mb-8">{deck.length} members loaded</p>
        <div className="space-y-4 w-full max-w-xs">
          <button 
            onClick={() => setMode('quiz')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Quiz Mode (Typing)
          </button>
          <button 
            onClick={() => setMode('practice')}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Practice Mode (Flashcards)
          </button>
          <button 
            onClick={() => {setMode('upload'); setDeck([]);}}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition mt-8"
          >
            Upload a different PDF
          </button>
        </div>
      </div>
    );
  }

  // --- CARD INTERFACE ---
  if (!currentPerson) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => setMode('menu')} className="text-gray-500 hover:text-gray-800 font-semibold">
          ← Back to Menu
        </button>
        <span className="text-sm font-semibold text-gray-500">
          Card {currentIndex + 1} of {deck.length}
        </span>
      </div>

      <div className="relative w-full max-w-sm h-96 perspective-1000">
        <div className={`w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped && mode === 'practice' ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col items-center">
            <img 
              src={`/${currentPerson.image}`} 
              alt="Ward Member"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400x500?text=No+Photo' }}
            />
            {mode === 'practice' && (
              <button 
                onClick={() => setIsFlipped(true)}
                className="absolute bottom-4 bg-white/90 px-6 py-2 rounded-full font-bold shadow-lg"
              >
                Tap to Flip
              </button>
            )}
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-2xl shadow-xl p-8 flex flex-col justify-center items-center text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentPerson.full_name}</h2>
            <p className="text-lg text-gray-600 mb-1">Prefers: {currentPerson.preferred_name}</p>
            <p className="text-lg text-gray-600 mb-1">From: {currentPerson.location}</p>
            <p className="text-xl font-bold text-blue-600 mt-4">Apt {currentPerson.apt}</p>
          </div>
        </div>
      </div>

      {mode === 'quiz' && (
        <form onSubmit={handleGuessSubmit} className="mt-8 w-full max-w-sm">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type name here..."
            className={`w-full p-4 rounded-lg border-2 text-lg text-center outline-none transition-colors ${
              feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-700' :
              feedback === 'incorrect' ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            autoFocus
          />
          {feedback === 'incorrect' && (
            <p className="text-red-500 text-center mt-2 text-sm font-semibold">
              Incorrect. Try again! (Mistakes: {mistakes})
            </p>
          )}
        </form>
      )}

      {mode === 'practice' && isFlipped && (
        <div className="mt-8 w-full max-w-sm flex space-x-4">
          <button 
            onClick={needsPractice}
            className="flex-1 bg-yellow-100 text-yellow-700 py-3 rounded-lg font-semibold hover:bg-yellow-200 transition"
          >
            Needs Practice
          </button>
          <button 
            onClick={advanceCard}
            className="flex-1 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition"
          >
            Got It
          </button>
        </div>
      )}
    </div>
  );
}