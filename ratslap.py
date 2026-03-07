import pygame
import random

pygame.init()

WIDTH, HEIGHT = 1000, 700
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Egyptian Rat Screw")

font = pygame.font.SysFont("arial", 30)
big = pygame.font.SysFont("arial", 60)

CARD_W = 100
CARD_H = 145

# -------- CARD SETUP --------

ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
suits = ['S','H','D','C']

rank_values = {r:i for i,r in enumerate(ranks)}

def build_deck():
    deck = []
    for r in ranks:
        for s in suits:
            deck.append(r+s)
    random.shuffle(deck)
    return deck

def get_rank(card):
    if card.startswith("10"):
        return "10"
    return card[0]

def is_face(card):
    return get_rank(card) in ["J","Q","K","A"]

def face_chances(card):
    return {"J":1,"Q":2,"K":3,"A":4}.get(get_rank(card),0)

# -------- LOAD CARD IMAGES --------

# Map ranks and suits to file names (e.g., s01.png, h11.png, d13.png)
rank_nums = {'A': '01', '2': '02', '3': '03', '4': '04', '5': '05',
             '6': '06', '7': '07', '8': '08', '9': '09', '10': '10',
             'J': '11', 'Q': '12', 'K': '13'}
suit_abbrev = {'S': 's', 'H': 'h', 'D': 'd', 'C': 'c'}

card_images = {}

for r in ranks:
    for s in suits:
        name = r+s
        filename = f"{suit_abbrev[s]}{rank_nums[r]}.png"
        img = pygame.image.load(f"cards/{filename}")
        img = pygame.transform.scale(img,(CARD_W,CARD_H))
        card_images[name] = img

back = pygame.image.load("cards/Card-Back-01.png")
back = pygame.transform.scale(back,(CARD_W,CARD_H))

# -------- SLAP RULES --------

def pair(p):
    return len(p)>=2 and get_rank(p[-1])==get_rank(p[-2])

def sandwich(p):
    return len(p)>=3 and get_rank(p[-1])==get_rank(p[-3])

def marriage(p):
    if len(p)<2: return False
    r1,r2=get_rank(p[-1]),get_rank(p[-2])
    return (r1=="K" and r2=="Q") or (r1=="Q" and r2=="K")

def divorce(p):
    if len(p)<3: return False
    return get_rank(p[-3]) in ["K","Q"] and get_rank(p[-1]) in ["K","Q"]

def jack_ten(p):
    if len(p)<2: return False
    r1,r2=get_rank(p[-1]),get_rank(p[-2])
    return (r1=="J" and r2=="10") or (r1=="10" and r2=="J")

def six_seven(p):
    return len(p)>=2 and get_rank(p[-2])=="6" and get_rank(p[-1])=="7"

def run(p):
    if len(p)<3: return False
    last_three_ranks = [get_rank(x) for x in p[-3:]]
    a,b,c=[rank_values[r] for r in last_three_ranks]
    
    # Standard consecutive check
    if (a+1==b and b+1==c) or (a-1==b and b-1==c):
        return True
    
    # Check for wrap-around runs: K-A-2 or 2-A-K (Ace and 2 must be in specific order with K)
    # K-A-2: (12, 0, 1)
    if a == 12 and b == 0 and c == 1:
        return True
    # 2-A-K: (1, 0, 12)
    if a == 1 and b == 0 and c == 12:
        return True
    
    return False

def valid_slap(p):
    if pair(p):
        return "Pair"
    elif sandwich(p):
        return "Sandwich"
    elif marriage(p):
        return "Marriage"
    elif divorce(p):
        return "Divorce"
    elif jack_ten(p):
        return "Jack-Ten"
    elif six_seven(p):
        return "Six-Seven"
    elif run(p):
        return "Run"
    return None

# -------- GAME STATE --------

deck = build_deck()
p1 = deck[:26]
p2 = deck[26:]

pile = []

turn = 0
challenge = 0
challenger = None

message = ""
slap_condition = ""  # Store the slap condition that was revealed
slapper = None  # Store which player slapped (0 or 1)

collection_timer = 0
collection_player = None

# Animation tracking
card_animation = None  # {'card': card, 'start_pos': (x,y), 'end_pos': (x,y), 'progress': 0, 'duration': 300, 'type': 'play'/'burn'}
burn_animation = None  # {'start_pos': (x,y), 'progress': 0, 'duration': 300, 'player': 0/1}
collection_animation = None  # {'player': 0/1, 'progress': 0, 'duration': 500, 'cards': [...]}

# -------- DRAW --------

def draw():

    screen.fill((30,120,40))

    # player decks
    screen.blit(back,(150,500))
    screen.blit(back,(750,50))

    p1txt = font.render(f"P1 cards: {len(p1)}",True,(255,255,255))
    p2txt = font.render(f"P2 cards: {len(p2)}",True,(255,255,255))

    screen.blit(p1txt,(120,650))
    screen.blit(p2txt,(720,20))

    # turn text
    t = font.render(f"Turn: Player {turn+1}",True,(255,255,0))
    screen.blit(t,(430,20))

    # pile cards
    visible = pile[-5:]

    for i,c in enumerate(visible):
        # Use index to generate consistent random offsets and rotation
        random.seed(len(pile) - len(visible) + i)
        offset_x = random.randint(-5, 5)
        offset_y = random.randint(-3, 3)
        rotation = random.randint(-10, 10)
        random.seed()  # Reset seed
        
        # Rotate card
        rotated_card = pygame.transform.rotate(card_images[c], rotation)
        # Get new rect for rotated card centered at pile position
        rotated_rect = rotated_card.get_rect(center=(450 + offset_x, 250 - i*2 + offset_y))
        screen.blit(rotated_card, rotated_rect)

    # draw animated card
    if card_animation:
        progress = card_animation['progress'] / card_animation['duration']
        sx, sy = card_animation['start_pos']
        ex, ey = card_animation['end_pos']
        x = sx + (ex - sx) * progress
        y = sy + (ey - sy) * progress
        # Center the card at the position
        card_img = card_images[card_animation['card']]
        rect = card_img.get_rect(center=(int(x), int(y)))
        screen.blit(card_img, rect)

    # draw burn animation
    if burn_animation:
        progress = burn_animation['progress'] / burn_animation['duration']
        alpha = int(255 * (1 - progress))
        bx, by = burn_animation['start_pos']
        scale = 1 - progress * 0.5
        if scale > 0:
            card_back = pygame.transform.scale(back, (int(CARD_W * scale), int(CARD_H * scale)))
            card_back.set_alpha(alpha)
            offset = (CARD_W - int(CARD_W * scale)) // 2
            screen.blit(card_back, (int(bx + offset), int(by + offset)))

    # draw collection animation
    if collection_animation:
        progress = collection_animation['progress'] / collection_animation['duration']
        player = collection_animation['player']
        end_pos = (150, 500) if player == 0 else (750, 50)
        # Show visible cards being collected
        visible_cards = collection_animation['cards'][-5:]
        for i, card in enumerate(visible_cards):
            sx, sy = 450, 250
            ex, ey = end_pos
            # Stagger the animation intensity with card depth
            card_progress = min(1.0, progress + (i * 0.1))
            x = sx + (ex - sx) * card_progress
            y = sy + (ey - sy) * card_progress
            card_img = card_images[card]
            rect = card_img.get_rect(center=(int(x), int(y)))
            screen.blit(card_img, rect)

    # message
    m = font.render(message,True,(255,200,200))
    screen.blit(m,(380,620))
    
    # slap condition message
    if slap_condition and collection_animation:
        condition_text = font.render(slap_condition, True, (255, 215, 0))
        screen.blit(condition_text, (380, 580))
        
        if slapper is not None:
            slapper_text = font.render(f"Player {slapper + 1} slapped!", True, (255, 100, 100))
            screen.blit(slapper_text, (380, 545))

    pygame.display.flip()

# -------- PILE COLLECTION --------

def collect(player):
    global pile, turn
    if player==0:
        p1.extend(pile)
    else:
        p2.extend(pile)
    pile=[]
    turn = player  # collector plays first

# -------- GAME LOOP --------

clock = pygame.time.Clock()
running=True

while running:

    clock.tick(60)

    for event in pygame.event.get():

        if event.type==pygame.QUIT:
            running=False

        if event.type==pygame.KEYDOWN:

            # ---- PLAY CARD ----

            if event.key==pygame.K_a and turn==0 and p1 and not card_animation and not burn_animation and not collection_animation:
                card=p1.pop(0)
                card_animation = {
                    'card': card,
                    'start_pos': (200, 572),
                    'end_pos': (450, 250),
                    'progress': 0,
                    'duration': 300,
                    'type': 'play',
                    'is_face': is_face(card),
                    'challenge_count': face_chances(card) if is_face(card) else 0,
                    'player': 0
                }

            if event.key==pygame.K_l and turn==1 and p2 and not card_animation and not burn_animation and not collection_animation:
                card=p2.pop(0)
                card_animation = {
                    'card': card,
                    'start_pos': (800, 122),
                    'end_pos': (450, 250),
                    'progress': 0,
                    'duration': 300,
                    'type': 'play',
                    'is_face': is_face(card),
                    'challenge_count': face_chances(card) if is_face(card) else 0,
                    'player': 1
                }

            # ---- SLAPS ----

            if event.key==pygame.K_LSHIFT and not card_animation and not burn_animation and not collection_animation:
                slap_result = valid_slap(pile)
                if slap_result:
                    slap_condition = slap_result
                    slapper = 0
                    collection_timer = 500
                    collection_player = 0
                    challenge = 0  # Reset challenge state
                    challenger = None
                else:
                    if p1:
                        card=p1.pop(0)
                        pile.insert(0, card)  # Add to bottom of pile
                        burn_animation = {
                            'start_pos': (450, 250),
                            'progress': 0,
                            'duration': 300,
                            'player': 0
                        }

            if event.key==pygame.K_RSHIFT and not card_animation and not burn_animation and not collection_animation:
                slap_result = valid_slap(pile)
                if slap_result:
                    slap_condition = slap_result
                    slapper = 1
                    collection_timer = 500
                    collection_player = 1
                    challenge = 0  # Reset challenge state
                    challenger = None
                else:
                    if p2:
                        card=p2.pop(0)
                        pile.insert(0, card)  # Add to bottom of pile
                        burn_animation = {
                            'start_pos': (450, 250),
                            'progress': 0,
                            'duration': 300,
                            'player': 1
                        }

    # handle card animations
    if card_animation:
        card_animation['progress'] += clock.get_time()
        if card_animation['progress'] >= card_animation['duration']:
            card = card_animation['card']
            pile.append(card)
            is_face_card = card_animation['is_face']
            challenge_count = card_animation['challenge_count']
            player = card_animation['player']
            card_animation = None
            
            if is_face_card:
                # Face card played - challenge the other player
                challenge = challenge_count
                challenger = player
                turn = 1 - player
            else:
                # Non-face card played
                if challenge > 0 and player == (1 - challenger):
                    # Challenged player is playing a non-face card during challenge
                    challenge -= 1
                    if challenge == 0:
                        # Challenge failed - challenger takes pile
                        collection_timer = 500
                        collection_player = challenger
                    # Challenged player plays again (don't change turn)
                else:
                    # No active challenge, alternate turns
                    turn = 1 - player

    # handle burn animations
    if burn_animation:
        burn_animation['progress'] += clock.get_time()
        if burn_animation['progress'] >= burn_animation['duration']:
            player = burn_animation['player']
            burn_animation = None
            # During a challenge, if the challenged player burns, they get another chance
            if challenge > 0 and player == (1 - challenger):
                # Challenged player keeps their turn
                turn = player
            else:
                # No challenge or challenger burned, alternate turns
                turn = 1 - player

    # handle collection delay and animation
    if collection_timer > 0:
        collection_timer -= clock.get_time()
        if collection_timer <= 0:
            collection_animation = {
                'player': collection_player,
                'progress': 0,
                'duration': 500,
                'cards': list(pile)
            }
            collection_timer = 0
            collection_player = None

    # handle collection animation
    if collection_animation:
        collection_animation['progress'] += clock.get_time()
        if collection_animation['progress'] >= collection_animation['duration']:
            collect(collection_animation['player'])
            collection_animation = None
            slap_condition = ""  # Clear condition after collection animation ends
            slapper = None  # Clear slapper after collection animation ends

    # win condition
    if len(p1)==0 and not pile:
        screen.fill((0,0,0))
        t=big.render("PLAYER 2 WINS",True,(255,255,255))
        screen.blit(t,(300,300))
        pygame.display.flip()
        pygame.time.wait(4000)
        running=False

    if len(p2)==0 and not pile:
        screen.fill((0,0,0))
        t=big.render("PLAYER 1 WINS",True,(255,255,255))
        screen.blit(t,(300,300))
        pygame.display.flip()
        pygame.time.wait(4000)
        running=False

    draw()

pygame.quit()
