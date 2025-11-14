import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { questions } from '../../data/questions';
import { Question } from '../../types/Question';
import { selectQuestions } from '../../utils/spacedRepetition';

const SPEED_MODE_DURATION = 60; // 60 seconds

const SpeedMode = () => {
  const setMode = useStore((state) => state.setMode);
  const questionStats = useStore((state) => state.questionStats);
  const updateQuestionStats = useStore((state) => state.updateQuestionStats);
  const incrementCorrect = useStore((state) => state.incrementCorrect);
  const incrementIncorrect = useStore((state) => state.incrementIncorrect);
  const currentStreak = useStore((state) => state.gameStats.currentStreak);

  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPEED_MODE_DURATION);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<number>>(new Set());

  const timerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unansweredQuestions = questions.filter(q => !answeredQuestionIds.has(q.id));
    const questionsToUse = unansweredQuestions.length > 0 ? unansweredQuestions : questions;
    const selected = selectQuestions(questionsToUse, questionStats, questionsToUse.length, 'all');
    setSelectedQuestions(selected);
  }, []);

  useEffect(() => {
    if (isStarted && timeLeft > 0 && !isComplete) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isStarted, timeLeft, isComplete]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
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
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">Loading...</div>;
  }

  if (!currentQuestion) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">Loading question...</div>;
  }

  if (shuffledOptions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">Loading options...</div>;
  }

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    setShowFeedback(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    updateQuestionStats(currentQuestion.id, isCorrect);
    setQuestionsAnswered(questionsAnswered + 1);

    if (isCorrect) {
      incrementCorrect();
      setScore(score + 1);
    } else {
      incrementIncorrect();
    }

    // Mark as answered
    const newAnsweredIds = new Set(answeredQuestionIds);
    newAnsweredIds.add(currentQuestion.id);
    setAnsweredQuestionIds(newAnsweredIds);
    
    // Auto-advance after brief feedback
    feedbackTimerRef.current = window.setTimeout(() => {
      if (currentIndex < selectedQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        // Ran out of questions
        setIsComplete(true);
      }
    }, 1000);
  };

  const handleRestart = () => {
    const unansweredQuestions = questions.filter(q => !answeredQuestionIds.has(q.id));
    const questionsToUse = unansweredQuestions.length > 0 ? unansweredQuestions : questions;
    
    if (unansweredQuestions.length === 0) {
      setAnsweredQuestionIds(new Set());
    }
    
    const selected = selectQuestions(questionsToUse, questionStats, questionsToUse.length, 'all');
    setSelectedQuestions(selected);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setTimeLeft(SPEED_MODE_DURATION);
    setIsStarted(false);
    setIsComplete(false);
    setQuestionsAnswered(0);
  };

  // Start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <div className="text-6xl mb-6">⚡</div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Speed Mode
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Answer as many questions as possible in 60 seconds!
            </p>
            
            <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-6 mb-8">
              <h3 className="font-bold mb-4 text-gray-900">How to Play:</h3>
              <ul className="text-left text-sm space-y-2 text-gray-700">
                <li>• You have 60 seconds on the clock</li>
                <li>• Answer questions as quickly as possible</li>
                <li>• Brief feedback after each answer</li>
                <li>• Build your streak for bonus points</li>
                <li>• Challenge yourself to beat your best score!</li>
              </ul>
            </div>

            <button onClick={handleStart} className="btn-primary text-xl px-12 py-4">
              Start Challenge! ⚡
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete screen
  if (isComplete) {
    const accuracy = questionsAnswered > 0 ? Math.round((score / questionsAnswered) * 100) : 0;
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Time's Up! ⚡
            </h2>
            <div className="text-6xl font-bold mb-6 text-gray-900">{score}</div>
            <div className="text-2xl mb-8 text-gray-700">Questions Answered Correctly</div>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{questionsAnswered}</div>
                <div className="text-sm opacity-90">Total Answered</div>
              </div>
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{accuracy}%</div>
                <div className="text-sm opacity-90">Accuracy</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-600 to-amber-600 text-white rounded-xl p-4">
                <div className="text-2xl font-bold">{currentStreak}</div>
                <div className="text-sm opacity-90">Best Streak</div>
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
          <div className="text-sm text-gray-600">
            Question {currentIndex + 1}
          </div>
          <div className="text-center flex-1">
            <div className={`text-5xl font-bold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
              {timeLeft}s
            </div>
          </div>
          <div className="flex gap-4 items-center text-sm text-gray-700">
            <div>
              Score: <span className="font-bold text-green-600">{score}</span>
            </div>
            <div>
              Streak: <span className="font-bold text-orange-600">{currentStreak} 🔥</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-xl animate-slide-up">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">{currentQuestion.question}</h2>

          {/* Answer Options */}
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correctAnswer;
              const showStatus = showFeedback;

              let className = 'w-full p-4 rounded-lg text-left transition-all duration-300 ';
              
              if (!showFeedback) {
                className += 'bg-gray-100 border-2 border-gray-300 text-gray-900 hover:bg-gray-200 hover:border-blue-500 cursor-pointer transform hover:scale-[1.02]';
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
                  disabled={showFeedback}
                  className={className}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showStatus && isCorrect && <span className="text-2xl">✓</span>}
                    {showStatus && isSelected && !isCorrect && <span className="text-2xl">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeedMode;
