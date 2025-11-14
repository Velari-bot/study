import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { questions } from '../../data/questions';
import { Question } from '../../types/Question';
import { selectQuestions } from '../../utils/spacedRepetition';

const WeakSpotDrill = () => {
  const setMode = useStore((state) => state.setMode);
  const questionStats = useStore((state) => state.questionStats);
  const updateQuestionStats = useStore((state) => state.updateQuestionStats);
  const incrementCorrect = useStore((state) => state.incrementCorrect);
  const incrementIncorrect = useStore((state) => state.incrementIncorrect);
  const currentStreak = useStore((state) => state.gameStats.currentStreak);

  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [improved, setImproved] = useState(0);
  const [practicedQuestionIds, setPracticedQuestionIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const unpracticedQuestions = questions.filter(q => !practicedQuestionIds.has(q.id));
    const questionsToUse = unpracticedQuestions.length > 0 ? unpracticedQuestions : questions;
    const selected = selectQuestions(questionsToUse, questionStats, questionsToUse.length, 'weakSpot');
    setSelectedQuestions(selected);
    setCurrentIndex(0); // Reset to first question when questions reload
  }, []);

  // Get current question - must be done before useMemo
  const currentQuestion = selectedQuestions.length > 0 && currentIndex < selectedQuestions.length 
    ? selectedQuestions[currentIndex] 
    : null;
  
  // Shuffle options when question changes using useMemo for synchronous computation
  // This hook MUST be called unconditionally (before any early returns)
  const shuffledOptions = useMemo(() => {
    if (!currentQuestion || !currentQuestion.multipleChoiceOptions) return [];
    const options = [...currentQuestion.multipleChoiceOptions];
    if (options.length === 0) return [];
    // Fisher-Yates shuffle algorithm
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }, [currentQuestion ? currentQuestion.id : null]);

  // Now we can do conditional returns AFTER all hooks
  if (selectedQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              No Weak Spots Found! 🎉
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              You're doing great! Try other modes to continue learning.
            </p>
            <button onClick={() => setMode('menu')} className="btn-success">
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Safety check
  if (!currentQuestion) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">Loading question...</div>;
  }
  
  // Safety check for shuffled options
  if (shuffledOptions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">Loading options...</div>;
  }
  
  const progress = ((currentIndex + 1) / selectedQuestions.length) * 100;

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answer);
    setShowExplanation(true);

    // Trim and compare to handle any whitespace issues
    const normalizedAnswer = answer.trim();
    const normalizedCorrect = currentQuestion.correctAnswer.trim();
    const isCorrect = normalizedAnswer === normalizedCorrect;
    
    console.log('Selected:', normalizedAnswer);
    console.log('Correct:', normalizedCorrect);
    console.log('Is Correct:', isCorrect);
    console.log('Current Question ID:', currentQuestion.id);
    
    updateQuestionStats(currentQuestion.id, isCorrect);

    if (isCorrect) {
      incrementCorrect();
      setScore(score + 1);
      setImproved(improved + 1);
    } else {
      incrementIncorrect();
    }
  };

  const handleNext = () => {
    // Mark this question as practiced
    const newPracticedIds = new Set(practicedQuestionIds);
    newPracticedIds.add(selectedQuestions[currentIndex].id);
    setPracticedQuestionIds(newPracticedIds);
    
    if (currentIndex < selectedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setShowHint(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    const unpracticedQuestions = questions.filter(q => !practicedQuestionIds.has(q.id));
    const questionsToUse = unpracticedQuestions.length > 0 ? unpracticedQuestions : questions;
    
    if (unpracticedQuestions.length === 0) {
      setPracticedQuestionIds(new Set());
    }
    
    const selected = selectQuestions(questionsToUse, questionStats, questionsToUse.length, 'weakSpot');
    setSelectedQuestions(selected);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    setScore(0);
    setIsComplete(false);
    setImproved(0);
  };

  if (isComplete) {
    const accuracy = Math.round((score / selectedQuestions.length) * 100);
    const improvementRate = Math.round((improved / selectedQuestions.length) * 100);
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              Weak Spot Drill Complete! 🎯
            </h2>
            <div className="text-6xl font-bold mb-6 text-gray-900">{score}/{selectedQuestions.length}</div>
            <div className="text-2xl mb-8 text-gray-700">{accuracy}% Accuracy</div>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{improved}</div>
                <div className="text-sm opacity-90">Improved</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-600 to-amber-600 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{improvementRate}%</div>
                <div className="text-sm opacity-90">Progress</div>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{currentStreak}</div>
                <div className="text-sm opacity-90">Best Streak</div>
              </div>
            </div>

            <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-6 mb-8">
              <p className="text-blue-800">
                {improved === selectedQuestions.length 
                  ? '🎉 Perfect! You\'ve improved on all your weak spots!'
                  : improved > selectedQuestions.length / 2
                  ? '💪 Great improvement! Keep practicing to master these questions.'
                  : '📚 Keep practicing! Review the explanations to understand the concepts better.'
                }
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={handleRestart} className="btn-primary">
                Practice Again
              </button>
              <button onClick={() => setMode('menu')} className="btn-success">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setMode('menu')}
            className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
          >
            ← Back
          </button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              Weak Spot Drill 🎯
            </h1>
            <div className="text-sm text-gray-600 mb-1">
              Question {currentIndex + 1} of {selectedQuestions.length}
            </div>
            <div className="flex gap-4 justify-center items-center text-sm text-gray-700">
              <div>
                Improved: <span className="font-bold text-green-600">{improved}</span>
              </div>
              <div>
                Score: <span className="font-bold text-yellow-600">{score}</span>
              </div>
              <div>
                Streak: <span className="font-bold text-orange-600">{currentStreak} 🔥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div
            className="bg-gradient-to-r from-yellow-600 to-amber-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Info Banner */}
        <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-4 mb-6 animate-fade-in">
          <p className="text-yellow-800 text-sm">
            💡 Focus mode: These are questions you've struggled with before. Take your time and use hints!
          </p>
        </div>

        {/* Question Card */}
        <div key={currentQuestion.id} className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-xl mb-6 animate-slide-up">
          <div className="text-xs text-gray-500 mb-2">Question ID: {currentQuestion.id} | {currentIndex + 1} of {selectedQuestions.length}</div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">{currentQuestion.question}</h2>

          {/* Hint - Always available in weak spot mode */}
          {!showExplanation && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="mb-4 text-sm text-blue-600 hover:text-blue-700 transition cursor-pointer font-semibold"
            >
              {showHint ? '🔓 Hide Hint' : '💡 Show Hint'}
            </button>
          )}
          {showHint && !showExplanation && (
            <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 mb-6 animate-slide-up">
              <p className="text-blue-800 text-sm">{currentQuestion.hint}</p>
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => {
              const isSelected = selectedAnswer?.trim() === option.trim();
              const isCorrect = option.trim() === currentQuestion.correctAnswer.trim();
              const showStatus = showExplanation;

              let className = 'w-full p-4 rounded-lg text-left transition-all duration-300 ';
              
              if (!showExplanation) {
                className += 'bg-gray-100 border-2 border-gray-300 text-gray-900 hover:bg-gray-200 hover:border-blue-500 cursor-pointer';
              } else if (isCorrect) {
                className += 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-700';
              } else if (isSelected && !isCorrect) {
                className += 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-2 border-red-700';
              } else {
                className += 'bg-gray-100 border-2 border-gray-300 text-gray-500 opacity-50';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showExplanation}
                  className={className}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showStatus && isCorrect && <span>✓</span>}
                    {showStatus && isSelected && !isCorrect && <span>✗</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Explanation */}
          {showExplanation && (
            <div className="mt-6 animate-slide-up">
              <div
                className={`rounded-lg p-6 border-2 ${
                  selectedAnswer?.trim() === currentQuestion.correctAnswer.trim()
                    ? 'bg-green-100 border-green-500'
                    : 'bg-red-100 border-red-500'
                }`}
              >
                <h3 className="font-bold mb-3 text-lg text-gray-900">
                  {selectedAnswer?.trim() === currentQuestion.correctAnswer.trim()
                    ? '✓ Excellent! You\'re improving!' 
                    : '✗ Let\'s review this together'}
                </h3>
                <div className="mb-3">
                  <strong className="text-sm text-gray-800">Correct Answer:</strong>
                  <p className="text-lg mt-1 text-gray-900">{currentQuestion.correctAnswer}</p>
                </div>
                <div className="mb-3">
                  <strong className="text-sm text-gray-800">Why this is correct:</strong>
                  <p className="text-sm mt-1 text-gray-700">{currentQuestion.explanation}</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3 mt-3">
                  <strong className="text-xs text-gray-700">💡 Remember:</strong>
                  <p className="text-sm mt-1 text-gray-700">{currentQuestion.hint}</p>
                </div>
              </div>

              <button onClick={handleNext} className="w-full mt-4 btn-primary">
                {currentIndex < selectedQuestions.length - 1 ? 'Next Question →' : 'Finish Drill'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeakSpotDrill;
