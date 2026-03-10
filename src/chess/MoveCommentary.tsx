import { useState, useEffect } from 'react';
import type { PieceType, PieceColor } from './engine';
import type { MemeMode } from './sounds';

// ---- Commentary pools ----

const GENERIC_MOVE_COMMENTS = [
  "Bold strategy Cotton, let's see if it pays off",
  "Outstanding move",
  "A move was made. Was it good? Probably not.",
  "That's certainly one of the moves of all time",
  "Even Stockfish is confused",
  "The audacity",
  "Big brain time",
  "200 IQ or 2 IQ, impossible to tell",
  "And the crowd goes mild",
  "Playing chess like it's checkers",
  "Task failed successfully",
  "Chaos theory in action",
  "Witness me",
  "What in the Elo rating is this",
  "He's making his move",
  "All according to keikaku",
  "Just as the prophecy foretold",
  "This is what peak performance looks like",
  "A calculated risk. The calculation was wrong.",
  "Somewhere, a chess coach felt a disturbance",
  "Subscribe to see what happens next",
  "The plot thickens",
  "Dun dun DUUUN",
  "We're in the endgame now",
  "I see you've studied the ancient texts",
  "Why do I hear boss music?",
  "I'm in danger",
  "Sir, this is a Wendy's",
  "First time?",
  "Improvise. Adapt. Overcome.",
];

const PIECE_MOVE_LINES: Record<PieceType, string[]> = {
  pawn: [
    "Go little rockstar",
    "The little guy's doing his best",
    "One small step for pawn...",
    "The cannon fodder advances",
    "I didn't choose the pawn life",
    "If I make it across I get a promotion, right?",
    "I volunteer as tribute",
    "Nobody expects the pawn",
    "I'm basically an intern",
    "En passant THIS",
    "Walking directly into danger, respect",
    "I may be small but I'm moving forward",
  ],
  knight: [
    "PARKOUR!",
    "The horse said jump",
    "L-shaped menace on the loose",
    "How does the horsey move again?",
    "Boing boing boing",
    "The knight chose violence today",
    "You can't predict me, I can't predict me",
    "Try drawing THAT on the board",
    "Bet you didn't see THAT coming",
    "I'm not random, I'm... okay I'm random",
    "The floor is lava and I'm the only one who gets it",
    "Jumping over pieces is my cardio",
  ],
  bishop: [
    "Sliding into your DMs diagonally",
    "Geometry class is in session",
    "The sniper takes position",
    "Life is better at 45 degrees",
    "I only move diagonally, it's not a phase",
    "According to my calculations... you're cooked",
    "I have a PhD in diagonal studies",
    "Pythagoras would be proud",
    "Straight lines? How pedestrian",
    "Why go straight when you can go diagonal?",
    "That bishop has trust issues",
    "Diagonal domination",
  ],
  rook: [
    "The tower has spoken",
    "Rook goes brrrrr",
    "Straight line? That's rook talk",
    "The castle is on the move. Literally.",
    "I don't do diagonals. Straight lines only.",
    "Built different. Literally built like a tower.",
    "Clear the lane",
    "I am the wall",
    "Orthogonal supremacy",
    "Heavy piece coming through, move aside",
    "Open file? Don't mind if I do",
    "I'm worth 5 points and I act like it",
  ],
  queen: [
    "Slay queen, literally",
    "The queen has entered the chat",
    "I can go anywhere. Try and stop me.",
    "Queen behavior only",
    "I woke up and chose domination",
    "Bow down",
    "The board is my runway",
    "I'm the most powerful piece and I know it",
    "The king hides behind me and we both know it",
    "I didn't come to play, I came to slay",
    "She can go anywhere she wants, and she chose violence",
    "I'm worth 9 points and it's still an understatement",
  ],
  king: [
    "Do I HAVE to move?",
    "Can someone else handle this?",
    "One square at a time, I'm not in a rush to die",
    "Is it over yet?",
    "Why is everything trying to kill me specifically",
    "I didn't sign up for this",
    "Everyone is fighting and I'm just vibing back here",
    "The king reluctantly scoots over one square",
    "Bravery... or panic?",
    "Please stop sacrificing my friends",
    "I move with the urgency of a Monday morning",
    "Castle me immediately, I'm not safe here",
  ],
};

const CHECK_LINES = [
  "CHECK! That's gotta hurt",
  "CHECK! Your king is sweating",
  "Oh no, your king is in danger",
  "CHECK YOURSELF BEFORE YOU WRECK YOURSELF",
  "Somebody call 911, the king is in trouble",
  "The king is having a bad day",
  "Your king is shaking in his little crown",
  "Hide yo king, hide yo wife",
  "Breaking news: local king in mortal peril",
  "The king has entered fight or flight mode",
  "Red alert! King under fire!",
  "Your king just got a reality check... literally",
  "The king is questioning all his life choices",
  "Your king is in the splash zone",
  "The king requests an immediate evacuation",
];

const RANDOM_INTERJECTIONS = [
  "Sheeeesh", "No cap", "Fr fr on god", "That's kinda sus ngl",
  "Bruh moment", "It's giving... chess", "Slay", "Oof size: large",
  "Lowkey fire move", "Highkey trash move", "Respectfully... what",
  "Huge diff", "That's mid at best", "Cope and seethe",
  "Touch grass after this game", "Certified hood classic",
  "It's over 9000!", "This is fine", "Suffering from success",
  "Always has been", "What da king doin?", "GG EZ",
  "Skill gap is showing", "Actual bot gameplay",
  "They don't know I'm playing 4D chess", "My goals are beyond your understanding",
  "It ain't much but it's honest work", "I am inevitable",
  "Perfectly balanced, as all things should be",
  "Ah, here we go again",
];

// ---- Desi mode extras ----

const DESI_GENERIC = [
  "Waah kya scene hai",
  "Yeh toh bahut hard ho gaya",
  "Kya kar raha hai bhai",
  "Arey yaar",
  "Achhe din aane wale hain",
  "Mitron!",
  "Yeh toh expected tha",
  "Sab golmaal hai",
  "Mogambo khush hua",
  "Picture abhi baaki hai mere dost",
  "Thoda aur drama karo",
  "Yeh kya ho raha hai",
  "Ek dum jhakaas!",
  "Don ko pakadna mushkil hi nahi, namumkin hai",
  "Kitne aadmi the?",
  "Pushpa, I hate tears",
  "Bade bade deshon mein aisi chhoti chhoti baatein hoti rehti hain",
  "Sharma ji ka beta would never",
  "Abey saale!",
  "Thalaiva mode activated",
  "Rishta kya kehlata hai... CHECKMATE",
  "Sasural genda phool",
  "IPL level drama",
  "Mann ki baat: yeh move bekar tha",
  "Tu beer hai!",
  "Kuch toh gadbad hai",
  "Baburao style",
];

const DESI_PIECE_LINES: Record<PieceType, string[]> = {
  pawn: [
    "Chota packet, bada dhamaka",
    "Apna time aayega",
    "Ek din rani ban jaungi",
    "Pyaada hu par pyaara hu",
    "Chal hat bsdk (in a lovable way)",
    "Mein chala, mujhe mat rokna",
  ],
  knight: [
    "Ghoda palti maar raha hai!",
    "L shape mein hi chalega, aur kuch nahi",
    "Parkour Bollywood style",
    "Ghode pe sawaar, seedha war",
    "Jumping jack flash",
    "Arre ghoda idhar aaya!",
  ],
  bishop: [
    "Tirchhi nazar wala",
    "Diagonal mein rehta hai, life mein bhi",
    "Unta hai par chalak hai",
    "Tirchha chalega, seedha nahi",
    "Geometry ke teacher ko proud kar raha hai",
    "Angle maarta hai har jagah",
  ],
  rook: [
    "Hathi mere saathi",
    "Seedha aur sachcha",
    "Heavy weight champion",
    "Tanker aa raha hai, rasta do",
    "Demolition squad ready",
    "Rook ne bola: path cleared",
  ],
  queen: [
    "Rani ka aadesh!",
    "Queen hai, hukum karo",
    "Sab pe bhari, rani humari",
    "Salaam-e-Ishq meri jaan",
    "Boss lady on the board",
    "Rani ne kaha - Mera board, meri marzi",
  ],
  king: [
    "Raja ko kya tension",
    "Ek hi toh square chal sakta hu",
    "Mujhe kyu ghuma rahe ho",
    "Raja hu par mazboot nahi",
    "Castle karo, mujhe bachao",
    "Main toh ek hi kadam chalta hu",
  ],
};

const DESI_CHECK_LINES = [
  "CHECK! Raja ki band baj gayi",
  "Oye hoye! Raja trouble mein!",
  "Raja ko danger! Koi bachao!",
  "CHECK! Abhi full drama hoga",
  "Raja bhaag raha hai!",
  "TV serial wala twist!",
  "CHECK! Achhe din gaye raja ke",
  "Raja ko attack! IPL level tension!",
  "Mitron, raja sankat mein hai",
  "Arey raja ko dekho, paseena aa raha hai",
];

const DESI_INTERJECTIONS = [
  "Arey wah!", "Kya baat hai!", "Yeh toh kamaal ho gaya",
  "Tu jaanta nahi mera baap kaun hai", "Full on dhamaal",
  "Paisa vasool move", "Sahi khel gaya",
  "Toh aaj ka entertainment ho gaya", "Bilkul filmy scene",
  "Jhakaas!", "Zabardast!", "Mind-blowing!",
  "First class move", "Shandar, Sundar, Bhayanakar",
  "Bahut hard!", "Kya scene hai yaar",
];

// ---- No-repeat tracker ----
const lastLines: Record<string, string | null> = {};

function pickLine(pool: string[], category: string): string {
  if (pool.length <= 1) return pool[0] ?? '';
  const last = lastLines[category];
  const filtered = last ? pool.filter(s => s !== last) : pool;
  const arr = filtered.length > 0 ? filtered : pool;
  const pick = arr[Math.floor(Math.random() * arr.length)]!;
  lastLines[category] = pick;
  return pick;
}

/** Pick a commentary line for a piece move */
export function getMoveCommentary(pieceType: PieceType, isCheck: boolean, mode: MemeMode): string {
  if (isCheck) {
    return pickLine(mode === 'desi' ? DESI_CHECK_LINES : CHECK_LINES, 'check');
  }

  // 40% piece-specific, 35% generic, 25% interjection
  const roll = Math.random();
  if (roll < 0.40) {
    const pool = mode === 'desi' ? (DESI_PIECE_LINES[pieceType] ?? []) : PIECE_MOVE_LINES[pieceType];
    if (pool.length > 0) return pickLine(pool, `piece-${pieceType}`);
  }
  if (roll < 0.75) {
    return pickLine(mode === 'desi' ? DESI_GENERIC : GENERIC_MOVE_COMMENTS, 'generic');
  }
  return pickLine(mode === 'desi' ? DESI_INTERJECTIONS : RANDOM_INTERJECTIONS, 'interjection');
}

// ---- Move Commentary Toast Component ----

interface MoveToastProps {
  text: string;
  color: string; // attacker color for styling
  visible: boolean;
}

export function MoveToast({ text, color, visible }: MoveToastProps) {
  const [opacity, setOpacity] = useState(0);
  const [slideY, setSlideY] = useState(20);

  useEffect(() => {
    if (visible) {
      setOpacity(1);
      setSlideY(0);
      const timer = setTimeout(() => {
        setOpacity(0);
        setSlideY(-10);
      }, 1800);
      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
      setSlideY(20);
    }
  }, [visible, text]);

  if (!visible && opacity <= 0) return null;

  const accentCol = color === 'white' ? '#6AD7E5' : '#CE6527';

  return (
    <div style={{
      position: 'fixed',
      bottom: '12%',
      left: '50%',
      transform: `translateX(-50%) translateY(${slideY}px)`,
      opacity,
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        border: `1px solid ${accentCol}66`,
        borderRadius: '12px',
        padding: '10px 24px',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 20px ${accentCol}22`,
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '15px',
          fontWeight: 600,
          color: '#fff',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          {text}
        </div>
      </div>
    </div>
  );
}
