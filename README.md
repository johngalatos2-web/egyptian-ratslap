# Egyptian Rat Slap

A digital implementation of the classic card game "Egyptian Rat Slap" (also known as "Spit" or "Egyptian Ratscrew").

## Features

- **Python Version** (`ratslap.py`): Full game implementation with pygame
- **Web Version** (`ratslap_web/`): HTML5 Canvas implementation playable in any browser

### Game Rules

Players alternate playing cards face-down to a central pile. Specific card combinations trigger slap opportunities:

- **Pair**: Two consecutive cards of the same rank
- **Sandwich**: Two cards of same rank with one card between them
- **Marriage**: King and Queen consecutive
- **Divorce**: King and Queen with one card between them
- **Jack-Ten**: Jack and 10 consecutive  
- **Six-Seven**: 6 followed by 7
- **Run**: Three consecutive ranks (with wrap-around: K-A-2, 2-A-K)

When a slappable condition appears, the first player to slap it wins the entire pile. Face cards trigger a challenge round where the opponent must play cards - if they can't play a face card before running out of chances, the challenger collects the pile.

## Controls

### Python Version
- Start: `python ratslap.py`
- Player 1: `A` to play, `Left Shift` to slap
- Player 2: `L` to play, `Right Shift` to slap

### Web Version
- Open `ratslap_web/index.html` in a web browser
- Player 1: `A` to play, `Left Shift` to slap
- Player 2: `L` to play, `Right Shift` to slap

## File Structure

```
egyptian-ratslap/
├── ratslap.py                 # Python implementation
├── ratslap_web/
│   ├── index.html            # Web game entry point
│   ├── game.js/
│   │   └── game.js           # Game logic and rendering
│   └── cards/                # Card images
└── cards/                    # Card images for Python version
```

## Implementation Details

### Python Version
- Built with pygame 2.6 on Python 3.13
- Handles all game logic, card animations, and turn management
- Proper state machine for challenges and collections

### Web Version
- Pure JavaScript with HTML5 Canvas
- Deterministic card positioning prevents visual jitter
- Animation state blocking ensures proper game flow
- All 52 cards rendered with proper face/back display

## Testing

Both versions have been tested to run complete games with proper:
- Slap detection across all 8 conditions
- Turn alternation and challenge handling
- Animation timing and visual stability
- Collection delay and cascade effects
