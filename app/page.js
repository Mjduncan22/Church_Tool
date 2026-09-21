'use client'

import { useState, useEffect } from 'react';
import wardData from './ward_data.json';

export default function WardMemorizer() {
  const [mode, setMode] = useState('menu'); // 'menu', 'quiz', 'practice'
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Quiz State
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' or 'incorrect'
  const [mistakes, setMistakes] = useState(0);

  // Practice State
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Shuffle deck on load
    const shuffled = [...wardData].sort(() => 0.5 - Math.random());
    setDeck(shuffled);
  }, []);

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
    // Move current card to the back of the deck
    const updatedDeck = [...deck];
    const card = updatedDeck.splice(currentIndex, 1)[0];
    updatedDeck.push(card);
    setDeck(updatedDeck);
    setIsFlipped(false);
  };

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Ward Memorizer</h1>
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
        </div>
      </div>
    );
  }

  if (!currentPerson) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => setMode('menu')} className="text-gray-500 hover:text-gray-800">
          ← Back to Menu
        </button>
        <span className="text-sm font-semibold text-gray-500">
          Card {currentIndex + 1} of {deck.length}
        </span>
      </div>

      {/* Card Container */}
      <div className="relative w-full max-w-sm h-96 perspective-1000">
        <div 
          className={`w-full h-full transition-transform duration-500 transform-style-3d ${
            isFlipped && mode === 'practice' ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front of Card */}
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

          {/* Back of Card (Practice Mode Only) */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-2xl shadow-xl p-8 flex flex-col justify-center items-center text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentPerson.full_name}</h2>
            <p className="text-lg text-gray-600 mb-1">Prefers: {currentPerson.preferred_name}</p>
            <p className="text-lg text-gray-600 mb-1">From: {currentPerson.location}</p>
            <p className="text-xl font-bold text-blue-600 mt-4">Apt {currentPerson.apt}</p>
          </div>
        </div>
      </div>

      {/* Quiz Controls */}
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

      {/* Practice Controls */}
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