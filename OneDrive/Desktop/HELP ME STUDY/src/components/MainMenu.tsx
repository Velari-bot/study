import { useStore } from '../store/useStore';
import { questions } from '../data/questions';

const MainMenu = () => {
  const setMode = useStore((state) => state.setMode);
  const getMasteredCount = useStore((state) => state.getMasteredCount);
  const getStudiedCount = useStore((state) => state.getStudiedCount);
  const getNeedsPracticeCount = useStore((state) => state.getNeedsPracticeCount);
  const getAccuracy = useStore((state) => state.getAccuracy);
  const bestStreak = useStore((state) => state.gameStats.bestStreak);

  const masteredCount = getMasteredCount();
  const studiedCount = getStudiedCount();
  const needsPracticeCount = getNeedsPracticeCount();
  const accuracy = getAccuracy();
  const totalQuestions = questions.length;
  
  const hasWeakSpots = needsPracticeCount > 0;

  const modes = [
    {
      id: 'multipleChoice',
      name: 'Multiple Choice Quiz',
      description: 'Traditional quiz with 4 answer choices',
      gradient: 'from-blue-600 to-blue-700',
      icon: '📝',
    },
    {
      id: 'flashcards',
      name: 'Flashcards',
      description: 'Click to flip between question and answer',
      gradient: 'from-blue-500 to-blue-600',
      icon: '🃏',
    },
    {
      id: 'speedMode',
      name: 'Speed Mode',
      description: '60-second challenge - answer as many as possible',
      gradient: 'from-red-600 to-orange-600',
      icon: '⚡',
    },
    {
      id: 'typeAnswer',
      name: 'Type Your Answer',
      description: 'Free-form text input with flexible matching',
      gradient: 'from-green-600 to-emerald-600',
      icon: '⌨️',
    },
    {
      id: 'matching',
      name: 'Matching Game',
      description: 'Match questions with their correct answers',
      gradient: 'from-blue-400 to-blue-600',
      icon: '🔗',
    },
    {
      id: 'weakSpot',
      name: 'Weak Spot Drill',
      description: 'Focused practice on questions you struggle with',
      gradient: 'from-yellow-600 to-amber-600',
      icon: '🎯',
      disabled: !hasWeakSpots,
    },
    {
      id: 'jumpGame',
      name: 'Jump Game',
      description: 'Answer questions to jump over obstacles!',
      gradient: 'from-green-600 to-emerald-600',
      icon: '🦕',
    },
    {
      id: 'dinosaurGame',
      name: 'Dinosaur Game',
      description: 'Run and jump over cacti! Answer questions to continue.',
      gradient: 'from-orange-600 to-red-600',
      icon: '🦖',
    },
    {
      id: 'flappyBird',
      name: 'Flappy Bird',
      description: 'Navigate through pipes! Answer questions correctly.',
      gradient: 'from-blue-600 to-cyan-600',
      icon: '🐦',
    },
  ];

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            AI Study App
          </h1>
          <p className="text-xl text-gray-700">Master European History Through Adaptive Learning</p>
        </div>

        {/* Progress Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12 animate-slide-up">
          <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-xl p-6 shadow-xl">
            <div className="text-3xl font-bold mb-2">{masteredCount}</div>
            <div className="text-sm opacity-90">Mastered</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 shadow-xl">
            <div className="text-3xl font-bold mb-2">
              {studiedCount}/{totalQuestions}
            </div>
            <div className="text-sm opacity-90">Studied</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white rounded-xl p-6 shadow-xl">
            <div className="text-3xl font-bold mb-2">{needsPracticeCount}</div>
            <div className="text-sm opacity-90">Need Practice</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-6 shadow-xl">
            <div className="text-3xl font-bold mb-2">{accuracy}%</div>
            <div className="text-sm opacity-90">Accuracy</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-600 to-amber-600 text-white rounded-xl p-6 shadow-xl">
            <div className="text-3xl font-bold mb-2">{bestStreak}</div>
            <div className="text-sm opacity-90">Best Streak</div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modes.map((mode, index) => (
            <button
              key={mode.id}
              onClick={() => !mode.disabled && setMode(mode.id as any)}
              disabled={mode.disabled}
              className={`
                bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-left transition-all duration-300
                ${mode.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer card-hover hover:border-blue-500'}
                animate-bounce-in
              `}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`text-4xl mb-4`}>{mode.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{mode.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{mode.description}</p>
              <div className={`h-1 rounded-full bg-gradient-to-r ${mode.gradient}`} />
              {mode.disabled && (
                <div className="mt-4 text-xs text-orange-600">
                  Complete some questions to unlock this mode
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer Stats */}
        {studiedCount > 0 && (
          <div className="mt-12 text-center text-gray-600 animate-fade-in">
            <p className="text-sm">
              You've studied {studiedCount} out of {totalQuestions} questions.
              {masteredCount > 0 && ` You've mastered ${masteredCount}! 🎉`}
            </p>
            {needsPracticeCount > 0 && (
              <p className="text-sm mt-2 text-orange-600">
                💡 Try Weak Spot Drill to focus on {needsPracticeCount} questions that need more practice
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainMenu;

