import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { questions } from '../../data/questions';
import { Question } from '../../types/Question';
import { selectQuestions } from '../../utils/spacedRepetition';

const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 4;
const PIPE_SPACING = 300;
const PIPE_GAP = 200;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  bottomY: number;
  question: Question;
  answered: boolean;
}

const FlappyBird = () => {
  const setMode = useStore((state) => state.setMode);
  const questionStats = useStore((state) => state.questionStats);
  const updateQuestionStats = useStore((state) => state.updateQuestionStats);
  const incrementCorrect = useStore((state) => state.incrementCorrect);
  const incrementIncorrect = useStore((state) => state.incrementIncorrect);

  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [birdY, setBirdY] = useState(CANVAS_HEIGHT / 2);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  
  const gameLoopRef = useRef<number | null>(null);
  const pipeIdRef = useRef(0);
  const lastPipeXRef = useRef(CANVAS_WIDTH);
  const selectedQuestionsRef = useRef<Question[]>([]);
  const questionIndexRef = useRef(0);
  const birdVelocityRef = useRef(0);
  const birdYRef = useRef(CANVAS_HEIGHT / 2);

  // Initialize questions
  useEffect(() => {
    const selected = selectQuestions(questions, questionStats, questions.length, 'all');
    selectedQuestionsRef.current = selected;
  }, [questionStats]);

  // Get next question
  const getNextQuestion = useCallback(() => {
    if (selectedQuestionsRef.current.length === 0) {
      const selected = selectQuestions(questions, questionStats, questions.length, 'all');
      selectedQuestionsRef.current = selected;
      questionIndexRef.current = 0;
    }
    
    const question = selectedQuestionsRef.current[questionIndexRef.current % selectedQuestionsRef.current.length];
    questionIndexRef.current++;
    return question;
  }, [questionStats]);

  // Shuffle options for current question
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
  }, [currentQuestion?.id]);

  // Handle jump/space key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && isStarted && !isGameOver && !showQuestion) {
        e.preventDefault();
        birdVelocityRef.current = JUMP_STRENGTH;
        setBirdVelocity(JUMP_STRENGTH);
      }
    };

    const handleClick = () => {
      if (isStarted && !isGameOver && !showQuestion) {
        birdVelocityRef.current = JUMP_STRENGTH;
        setBirdVelocity(JUMP_STRENGTH);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [isStarted, isGameOver, showQuestion]);

  // Game loop
  useEffect(() => {
    if (!isStarted || isGameOver || showQuestion) return;

    const gameLoop = () => {
      // Update bird physics
      birdVelocityRef.current += GRAVITY;
      birdYRef.current = Math.max(30, Math.min(CANVAS_HEIGHT - 30, birdYRef.current + birdVelocityRef.current));
      
      setBirdY(birdYRef.current);
      setBirdVelocity(birdVelocityRef.current);

      // Update pipes and check collisions
      setPipes((prevPipes) => {
        let newPipes = prevPipes
          .map((pipe) => ({
            ...pipe,
            x: pipe.x - PIPE_SPEED,
          }))
          .filter((pipe) => pipe.x > -100);

        // Check collision with bird
        const birdX = 150;
        const birdWidth = 40;
        const birdHeight = 30;
        const birdTop = birdYRef.current - birdHeight / 2;
        const birdBottom = birdYRef.current + birdHeight / 2;

        newPipes.forEach((pipe) => {
          if (!pipe.answered && pipe.x < birdX + birdWidth && pipe.x + 80 > birdX) {
            if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
              // Collision! Show question
              if (!showQuestion) {
                setCurrentQuestion(pipe.question);
                setShowQuestion(true);
              }
            }
          }
        });

        // Add new pipes
        const rightmostX = newPipes.length > 0 
          ? Math.max(...newPipes.map(p => p.x))
          : lastPipeXRef.current;
        
        if (rightmostX < CANVAS_WIDTH + 200) {
          const question = getNextQuestion();
          const topHeight = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50;
          const bottomY = topHeight + PIPE_GAP;
          const newX = Math.max(CANVAS_WIDTH, rightmostX + PIPE_SPACING);
          newPipes.push({
            id: pipeIdRef.current++,
            x: newX,
            topHeight,
            bottomY,
            question,
            answered: false,
          });
          lastPipeXRef.current = newX;
        }

        // Update score for passed pipes
        newPipes.forEach((pipe) => {
          if (pipe.x < 100 && !pipe.answered && pipe.x + 80 > 100) {
            setScore((prev) => prev + 1);
          }
        });

        return newPipes;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isStarted, isGameOver, showQuestion, getNextQuestion]);

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return;
    
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    updateQuestionStats(currentQuestion.id, isCorrect);

    if (isCorrect) {
      incrementCorrect();
      // Remove pipe and continue
      setPipes((prev) =>
        prev.map((pipe) =>
          pipe.question.id === currentQuestion.id ? { ...pipe, answered: true, x: -200 } : pipe
        )
      );
      setScore((prev) => prev + 1);
    } else {
      incrementIncorrect();
      // Game over
      setIsGameOver(true);
    }

    setShowQuestion(false);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
  };

  const handleStart = () => {
    setIsStarted(true);
    setIsGameOver(false);
    setScore(0);
    setBirdY(CANVAS_HEIGHT / 2);
    setBirdVelocity(0);
    birdYRef.current = CANVAS_HEIGHT / 2;
    birdVelocityRef.current = 0;
    setPipes([]);
    lastPipeXRef.current = CANVAS_WIDTH;
    pipeIdRef.current = 0;
    questionIndexRef.current = 0;
  };

  // Start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <div className="text-6xl mb-6">🐦</div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Flappy Bird
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Navigate through pipes! Answer questions correctly to continue.
            </p>
            
            <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-6 mb-8">
              <h3 className="font-bold mb-4 text-gray-900">How to Play:</h3>
              <ul className="text-left text-sm space-y-2 text-gray-700">
                <li>• Press <strong>SPACE</strong>, <strong>↑</strong>, or <strong>CLICK</strong> to flap</li>
                <li>• When you hit a pipe, answer the question correctly</li>
                <li>• Correct answers let you continue flying</li>
                <li>• Wrong answers end the game</li>
                <li>• Avoid hitting the top or bottom!</li>
              </ul>
            </div>

            <button onClick={handleStart} className="btn-primary text-xl px-12 py-4">
              Start Flying! 🐦
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game over screen
  if (isGameOver) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Game Over! 💥
            </h2>
            <div className="text-6xl font-bold mb-6 text-gray-900">{score}</div>
            <div className="text-2xl mb-8 text-gray-700">Pipes Passed</div>

            <div className="flex gap-4 justify-center">
              <button onClick={handleStart} className="btn-primary">
                Play Again
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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Game Canvas */}
      <div 
        className="relative mx-auto border-4 border-gray-800"
        style={{ 
          width: `${CANVAS_WIDTH}px`, 
          height: `${CANVAS_HEIGHT}px`,
          backgroundColor: '#87CEEB'
        }}
      >
        {/* Sky background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-300 to-blue-100" />

        {/* Bird */}
        <div
          className="absolute transition-none"
          style={{
            left: '150px',
            top: `${birdY - 15}px`,
            width: '40px',
            height: '30px',
            fontSize: '30px',
            transform: `rotate(${Math.min(30, Math.max(-30, birdVelocity * 2))}deg)`,
          }}
        >
          🐦
        </div>

        {/* Pipes */}
        {pipes.map((pipe) => (
          <div key={pipe.id}>
            {/* Top pipe */}
            <div
              className="absolute bg-green-600 border-2 border-green-800"
              style={{
                left: `${pipe.x}px`,
                top: '0px',
                width: '80px',
                height: `${pipe.topHeight}px`,
              }}
            />
            {/* Top pipe cap */}
            <div
              className="absolute bg-green-700 border-2 border-green-900"
              style={{
                left: `${pipe.x - 5}px`,
                top: `${pipe.topHeight - 30}px`,
                width: '90px',
                height: '30px',
              }}
            />
            {/* Bottom pipe */}
            <div
              className="absolute bg-green-600 border-2 border-green-800"
              style={{
                left: `${pipe.x}px`,
                top: `${pipe.bottomY}px`,
                width: '80px',
                height: `${CANVAS_HEIGHT - pipe.bottomY}px`,
              }}
            />
            {/* Bottom pipe cap */}
            <div
              className="absolute bg-green-700 border-2 border-green-900"
              style={{
                left: `${pipe.x - 5}px`,
                top: `${pipe.bottomY}px`,
                width: '90px',
                height: '30px',
              }}
            />
          </div>
        ))}

        {/* Ground */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-green-700 border-t-4 border-green-900"
          style={{ height: '30px' }}
        />

        {/* Score Display */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg">
          <div className="text-2xl font-bold">Score: {score}</div>
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
          SPACE/↑/CLICK to flap
        </div>
      </div>

      {/* Question Modal */}
      {showQuestion && currentQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-bounce-in">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">
              Answer correctly to continue!
            </h3>
            <h4 className="text-xl font-semibold mb-6 text-gray-800">
              {currentQuestion.question}
            </h4>

            <div className="space-y-3 mb-6">
              {shuffledOptions.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.correctAnswer;

                let className = 'w-full p-4 rounded-lg text-left transition-all duration-300 ';
                
                if (!selectedAnswer) {
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
                    onClick={() => !selectedAnswer && handleAnswerSelect(option)}
                    disabled={!!selectedAnswer}
                    className={className}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {selectedAnswer && isCorrect && <span>✓</span>}
                      {isSelected && !isCorrect && <span>✗</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedAnswer && (
              <div className="mt-4 p-4 bg-blue-100 border-2 border-blue-500 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Explanation:</strong> {currentQuestion.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlappyBird;

