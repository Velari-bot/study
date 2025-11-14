import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { questions } from '../../data/questions';
import { Question } from '../../types/Question';
import { selectQuestions } from '../../utils/spacedRepetition';

const MultipleChoice = () => {
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
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Get questions that haven't been answered yet in this session
    const unansweredQuestions = questions.filter(q => !answeredQuestionIds.has(q.id));
    const questionsToUse = unansweredQuestions.length > 0 ? unansweredQuestions : questions;
    
    const selected = selectQuestions(questionsToUse, questionStats, questionsToUse.length, 'all');
    if (selected.length > 0) {
      setSelectedQuestions(selected);
    } else {
      // Fallback: if no questions selected, use all questions
      setSelectedQuestions(questionsToUse.slice(0, Math.min(10, questionsToUse.length)));
    }
  }, [questionStats]);

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
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">Loading...</div>;
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

  const handleAnswerSelect = (answer: string, questionId: number) => {
    if (showExplanation) return;
    
    // Double-check we're answering the current question
    if (!currentQuestion || currentQuestion.id !== questionId) {
      return;
    }
    
    setSelectedAnswer(answer);
    setShowExplanation(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    updateQuestionStats(currentQuestion.id, isCorrect);

    if (isCorrect) {
      incrementCorrect();
      setScore(score + 1);
    } else {
      incrementIncorrect();
    }
  };

  const handleNext = () => {
    // Mark this question as answered
    const currentQuestionId = selectedQuestions[currentIndex]?.id;
    if (currentQuestionId) {
      const newAnsweredIds = new Set(answeredQuestionIds);
      newAnsweredIds.add(currentQuestionId);
      setAnsweredQuestionIds(newAnsweredIds);
    }
    
    // Clear all answer-related state first
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    
    // Then move to next question using functional update
    setCurrentIndex((prevIndex) => {
      if (prevIndex < selectedQuestions.length - 1) {
        return prevIndex + 1;
      } else {
        setIsComplete(true);
        return prevIndex;
      }
    });
  };

  const handleRestart = () => {
    // Get questions that haven't been answered yet in this session
    const unansweredQuestions = questions.filter(q => !answeredQuestionIds.has(q.id));
    const questionsToUse = unansweredQuestions.length > 0 ? unansweredQuestions : questions;
    
    // If we've answered all questions, reset the answered set
    if (unansweredQuestions.length === 0) {
      setAnsweredQuestionIds(new Set());
    }
    
    const selected = selectQuestions(questionsToUse, questionStats, questionsToUse.length, 'all');
    setSelectedQuestions(selected);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    setScore(0);
    setIsComplete(false);
  };

  if (isComplete) {
    const accuracy = Math.round((score / selectedQuestions.length) * 100);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Quiz Complete! 🎉
            </h2>
            <div className="text-6xl font-bold mb-6 text-gray-900">{score}/{selectedQuestions.length}</div>
            <div className="text-2xl mb-8 text-gray-700">{accuracy}% Accuracy</div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-sm opacity-90">Correct</div>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{currentStreak}</div>
                <div className="text-sm opacity-90">Current Streak</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={handleRestart} className="btn-primary">
                Try Again
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
            <div className="text-sm text-gray-600 mb-1">
              Question {currentIndex + 1} of {selectedQuestions.length}
            </div>
            <div className="flex gap-4 justify-center items-center text-sm text-gray-700">
              <div>
                Score: <span className="font-bold text-green-600">{score}</span>
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
            className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-xl mb-6 animate-slide-up">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">{currentQuestion.question}</h2>

          {/* Hint */}
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
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correctAnswer;
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
                  key={`${currentQuestion.id}-${option}-${index}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!showExplanation && currentQuestion) {
                      handleAnswerSelect(option, currentQuestion.id);
                    }
                  }}
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

          {/* Explanation */}
          {showExplanation && (
            <div className="mt-6 animate-slide-up">
              <div
                className={`rounded-lg p-6 ${
                  selectedAnswer === currentQuestion.correctAnswer
                    ? 'bg-green-100 border-2 border-green-500'
                    : 'bg-red-100 border-2 border-red-500'
                }`}
              >
                <h3 className="font-bold mb-2 text-lg text-gray-900">
                  {selectedAnswer === currentQuestion.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
                </h3>
                <p className="text-sm mb-2 text-gray-800">
                  <strong>Correct Answer:</strong> {currentQuestion.correctAnswer}
                </p>
                <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
              </div>

              <button onClick={handleNext} className="w-full mt-4 btn-primary">
                {currentIndex < selectedQuestions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultipleChoice;
