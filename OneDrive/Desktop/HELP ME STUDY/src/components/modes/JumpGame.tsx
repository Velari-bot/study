import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { questions } from '../../data/questions';
import { Question } from '../../types/Question';
import { selectQuestions } from '../../utils/spacedRepetition';

const GRAVITY = 0.6;
const JUMP_STRENGTH = -12;
const OBSTACLE_SPEED = 5;
const OBSTACLE_SPACING = 300;
const GROUND_HEIGHT = 50;

interface Obstacle {
  id: number;
  x: number;
  height: number;
  question: Question;
  answered: boolean;
}

const JumpGame = () => {
  const setMode = useStore((state) => state.setMode);
  const questionStats = useStore((state) => state.questionStats);
  const updateQuestionStats = useStore((state) => state.updateQuestionStats);
  const incrementCorrect = useStore((state) => state.incrementCorrect);
  const incrementIncorrect = useStore((state) => state.incrementIncorrect);

  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [playerY, setPlayerY] = useState(300);
  const [playerVelocity, setPlayerVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [gameSpeed, setGameSpeed] = useState(1);
  
  const gameLoopRef = useRef<number | null>(null);
  const obstacleIdRef = useRef(0);
  const lastObstacleXRef = useRef(800);
  const selectedQuestionsRef = useRef<Question[]>([]);
  const questionIndexRef = useRef(0);
  const playerVelocityRef = useRef(0);

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
      if (e.code === 'Space' && isStarted && !isGameOver && !showQuestion) {
        e.preventDefault();
        playerVelocityRef.current = JUMP_STRENGTH;
        setPlayerVelocity(JUMP_STRENGTH);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isStarted, isGameOver, showQuestion]);

  // Game loop
  useEffect(() => {
    if (!isStarted || isGameOver || showQuestion) return;

    const gameLoop = () => {
      // Update player physics
      setPlayerVelocity((prevVel) => {
        const newVel = prevVel + GRAVITY;
        return newVel;
      });
      
      setPlayerY((prevY) => {
        const newY = Math.max(50, Math.min(550 - GROUND_HEIGHT, prevY + playerVelocity));
        return newY;
      });

      // Update obstacles and check collisions
      setObstacles((prevObstacles) => {
        let newObstacles = prevObstacles
          .map((obs) => ({
            ...obs,
            x: obs.x - OBSTACLE_SPEED * gameSpeed,
          }))
          .filter((obs) => obs.x > -200);

        // Check collision with player
        const playerX = 100;
        const playerWidth = 40;
        const playerHeight = 40;
        const playerTop = playerY;
        const playerBottom = playerY + playerHeight;

        newObstacles.forEach((obs) => {
          if (!obs.answered && obs.x < playerX + playerWidth && obs.x + 60 > playerX) {
            const obstacleTop = 600 - GROUND_HEIGHT - obs.height;
            if (playerBottom > obstacleTop && playerTop < 600 - GROUND_HEIGHT) {
              // Collision! Show question
              if (!showQuestion) {
                setCurrentQuestion(obs.question);
                setShowQuestion(true);
              }
            }
          }
        });

        // Add new obstacles
        const rightmostX = newObstacles.length > 0 
          ? Math.max(...newObstacles.map(o => o.x))
          : lastObstacleXRef.current;
        
        if (rightmostX < 1000) {
          const question = getNextQuestion();
          const height = Math.random() * 150 + 80;
          const newX = Math.max(800, rightmostX + OBSTACLE_SPACING);
          newObstacles.push({
            id: obstacleIdRef.current++,
            x: newX,
            height,
            question,
            answered: false,
          });
          lastObstacleXRef.current = newX;
        }

        // Update score for passed obstacles
        newObstacles.forEach((obs) => {
          if (obs.x < 50 && !obs.answered) {
            setScore((prev) => prev + 1);
          }
        });

        return newObstacles;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isStarted, isGameOver, showQuestion, gameSpeed, playerY, playerVelocity, getNextQuestion]);

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return;
    
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    updateQuestionStats(currentQuestion.id, isCorrect);

    if (isCorrect) {
      incrementCorrect();
      // Remove obstacle and continue
      setObstacles((prev) =>
        prev.map((obs) =>
          obs.question.id === currentQuestion.id ? { ...obs, answered: true, x: -200 } : obs
        )
      );
      setScore((prev) => prev + 1);
      setGameSpeed((prev) => Math.min(2, prev + 0.05));
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
    setPlayerY(300);
    setPlayerVelocity(0);
    setObstacles([]);
    setGameSpeed(1);
    lastObstacleXRef.current = 800;
    obstacleIdRef.current = 0;
    questionIndexRef.current = 0;
  };

  // Start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-2xl animate-bounce-in">
          <div className="text-center">
            <div className="text-6xl mb-6">🦕</div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Jump Game
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Answer questions correctly to jump over obstacles!
            </p>
            
            <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-6 mb-8">
              <h3 className="font-bold mb-4 text-gray-900">How to Play:</h3>
              <ul className="text-left text-sm space-y-2 text-gray-700">
                <li>• Press <strong>SPACE</strong> to jump</li>
                <li>• When you hit an obstacle, answer the question correctly</li>
                <li>• Correct answers let you continue</li>
                <li>• Wrong answers end the game</li>
                <li>• Game speed increases as you progress!</li>
              </ul>
            </div>

            <button onClick={handleStart} className="btn-primary text-xl px-12 py-4">
              Start Game! 🦕
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
            <div className="text-2xl mb-8 text-gray-700">Obstacles Cleared</div>

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
      <div className="relative w-full h-screen" style={{ height: '600px' }}>
        {/* Sky background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-200" />
        
        {/* Ground */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-green-600 to-green-800"
          style={{ height: `${GROUND_HEIGHT}px` }}
        />

        {/* Player (Dinosaur) */}
        <div
          className="absolute transition-transform duration-75"
          style={{
            left: '100px',
            bottom: `${GROUND_HEIGHT}px`,
            transform: `translateY(-${playerY}px)`,
            width: '40px',
            height: '40px',
            fontSize: '40px',
          }}
        >
          🦕
        </div>

        {/* Obstacles (Cacti) */}
        {obstacles.map((obstacle) => (
          <div
            key={obstacle.id}
            className="absolute"
            style={{
              left: `${obstacle.x}px`,
              bottom: `${GROUND_HEIGHT}px`,
              width: '60px',
              height: `${obstacle.height}px`,
            }}
          >
            <div
              className="w-full h-full flex items-end justify-center text-4xl"
              style={{ transform: `translateY(-${obstacle.height}px)` }}
            >
              🌵
            </div>
          </div>
        ))}

        {/* Score Display */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg">
          <div className="text-2xl font-bold">Score: {score}</div>
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
          Press SPACE to jump
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

export default JumpGame;

