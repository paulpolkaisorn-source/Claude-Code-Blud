#!/usr/bin/env python3
"""THE HOLLOW HOUSE - a short terminal horror game.

Standard library only. Run it with:

    python3 horror_game.py

Options:
    --seed N   repeatable randomness (same seed, same events)
    --fast     skip the typewriter effect
"""

import argparse
import os
import random
import sys
import time
from collections import deque

RESET = "\033[0m"
BOLD = "\033[1m"
RED = "\033[31m"
GREEN = "\033[32m"
GREY = "\033[90m"

BATTERY_MAX = 15        # turns of light per set of batteries
ENTITY_SPEED = 3        # the entity moves one room every N turns
HUNT_CHANCE = 0.7      # chance each move that it heads straight for you
START_ROOM = "hall"
ENTITY_START = "cellar"
KEY_PIECES = ["rusted key piece", "bloody key piece", "silver key piece"]

DIRECTIONS = {"n": "north", "s": "south", "e": "east", "w": "west",
              "u": "up", "d": "down", "o": "out"}

VERB_ALIASES = {"take": "take", "get": "take", "grab": "take",
                "use": "use", "look": "look", "l": "look",
                "hide": "hide", "wait": "wait", "z": "wait",
                "inventory": "inventory", "i": "inventory",
                "help": "help", "h": "help",
                "quit": "quit", "q": "quit", "exit": "quit",
                "go": "go"}

ROOMS = {
    "hall": {
        "name": "Front Hall",
        "desc": ("Wallpaper peels from the walls like old skin. A cracked mirror hangs "
                 "above a dead fireplace. At the end of the hall, a heavy front door "
                 "waits, its lock rusted shut."),
        "exits": {"north": "kitchen", "east": "bedroom", "up": "attic",
                  "down": "cellar", "out": "front door"},
        "items": [],
        "hide": "coat closet",
    },
    "kitchen": {
        "name": "Kitchen",
        "desc": ("Rotten food sits on the counters. The faucet drips, slow and steady, "
                 "like a clock counting down."),
        "exits": {"south": "hall", "east": "study"},
        "items": ["rusted key piece"],
        "hide": None,
    },
    "study": {
        "name": "Study",
        "desc": ("Papers are scattered across a desk. Someone scratched the same word "
                 "into the wall again and again."),
        "exits": {"west": "kitchen", "south": "bedroom"},
        "items": ["batteries", "old note"],
        "hide": "desk",
    },
    "bedroom": {
        "name": "Bedroom",
        "desc": ("The bed sheets are pulled back, as if someone just got up. The air "
                 "smells of wet earth."),
        "exits": {"west": "hall", "north": "study"},
        "items": [],
        "hide": "wardrobe",
    },
    "cellar": {
        "name": "Cellar",
        "desc": ("Stone steps lead down to a low, damp room. Wooden crates line the "
                 "walls. The air is cold and smells of iron."),
        "exits": {"up": "hall"},
        "items": ["bloody key piece"],
        "hide": "crates",
    },
    "attic": {
        "name": "Attic",
        "desc": ("Rafters sag above you and dust hangs in the flashlight beam. A music "
                 "box plays one broken note, over and over."),
        "exits": {"down": "hall"},
        "items": ["silver key piece"],
        "hide": None,
    },
}

NOTE_TEXT = ('"If you hear the stairs creak, it has already decided. Do not look at '
             'the cellar door. Do not answer when it says your name."')

CREEPY_REPLIES = [
    "The house doesn't understand you. Neither do you.",
    "Your voice comes back a half-second late. You didn't say that.",
    "Somewhere upstairs, something laughs. Quietly.",
    "Nothing happens. Nothing ever happens here. That's the problem.",
]

INTRO = [
    "THE HOLLOW HOUSE",
    "",
    "Your car died a mile back, in the rain. The farmhouse was the only light.",
    "The front door was open. Now it isn't.",
    "Find the three pieces of the front door key and get out before it finds you.",
    "Type 'help' for commands.",
]


def colored(text, color):
    return f"{color}{text}{RESET}"


def neighbors(room):
    """Rooms directly reachable from `room` (excludes the front door)."""
    return [dest for dest in ROOMS[room]["exits"].values() if dest in ROOMS]


def next_step(start, goal):
    """First room on the shortest path from start toward goal, or None."""
    if start == goal:
        return None
    came_from = {start: None}
    queue = deque([start])
    while queue:
        current = queue.popleft()
        if current == goal:
            break
        for nxt in neighbors(current):
            if nxt not in came_from:
                came_from[nxt] = current
                queue.append(nxt)
    if goal not in came_from:
        return None
    step = goal
    while came_from[step] != start:
        step = came_from[step]
    return step


def parse_command(text):
    """Split raw input into (verb, argument). Verb is None if unrecognized."""
    words = text.strip().lower().split()
    if not words:
        return None, ""
    verb, rest = words[0], " ".join(words[1:])
    if verb in DIRECTIONS:
        return "go", DIRECTIONS[verb]
    if verb in DIRECTIONS.values():
        return "go", verb
    if verb == "go":
        return "go", DIRECTIONS.get(rest, rest)
    if verb in VERB_ALIASES:
        return VERB_ALIASES[verb], rest
    return None, text


def find_item(items, arg):
    """Match a typed item name against items in a room or inventory."""
    if not arg:
        return None
    for item in items:
        if arg == item or arg in item:
            return item
    return None


class Game:
    def __init__(self, rng, fast=False):
        self.rng = rng
        self.fast = fast
        self.items = {name: list(room["items"]) for name, room in ROOMS.items()}
        self.room = START_ROOM
        self.inventory = []
        self.battery = BATTERY_MAX
        self.sanity = 100
        self.broken = False
        self.break_timer = 0
        self.hidden = False
        self.entity_room = ENTITY_START
        self.entity_timer = 0
        self.turn = 0
        self.over = False

    # ----- output -------------------------------------------------------

    def say(self, text="", delay=True):
        """Print text with a typewriter effect unless disabled."""
        if delay and not self.fast and text:
            for ch in text:
                sys.stdout.write(ch)
                sys.stdout.flush()
                time.sleep(0.012)
            sys.stdout.write("\n")
        else:
            print(text)

    def garble(self, text):
        words = text.split()
        return " ".join(self.rng.sample(words, len(words)))

    def describe(self):
        room = ROOMS[self.room]
        self.say(f"\n{BOLD}== {room['name']} =={RESET}", delay=False)
        if self.battery == 0:
            desc = "Total darkness. Cold walls, a doorframe, and the smell of damp."
        else:
            desc = room["desc"]
        if self.broken:
            desc = self.garble(desc)
        self.say(desc)
        if self.battery > 0 and self.items[self.room]:
            self.say("You can see: " + ", ".join(self.items[self.room]) + ".")
        self.say("Exits: " + ", ".join(room["exits"]) + ".")

    def show_status(self):
        light = self.battery if self.battery > 0 else "out"
        self.say(colored(f"  [Light: {light} | Sanity: {self.sanity}]", GREY), delay=False)

    def show_inventory(self):
        if self.inventory:
            self.say("You are carrying: " + ", ".join(self.inventory) + ".")
        else:
            self.say("Your pockets are empty.")
        light = f"{self.battery} turns" if self.battery > 0 else "dead"
        self.say(f"Flashlight: {light}.")

    def show_help(self):
        self.say("Commands:")
        self.say("  go <dir> (n/s/e/w/u/d/out)  - move through the house")
        self.say("  take <item>                 - pick something up")
        self.say("  use <item>                  - use or read something you carry")
        self.say("  hide                        - crouch behind a hiding spot")
        self.say("  wait (z)                    - stay still and listen")
        self.say("  look                        - look around again")
        self.say("  inventory (i)               - check your things")
        self.say("  help (h)                    - show this list")
        self.say("  quit (q)                    - give up")

    # ----- actions (return True if the action takes a turn) -------------

    def move(self, direction):
        if not direction:
            self.say("Go where?")
            return False
        exits = ROOMS[self.room]["exits"]
        if direction not in exits:
            self.say("You can't go that way.")
            return False
        target = exits[direction]
        if target == "front door":
            if "front door key" in self.inventory:
                self.win()
            else:
                self.say("The front door is locked. The lock is shaped for a key you don't have yet.")
            return False
        self.room = target
        self.hidden = False
        self.describe()
        return True

    def take(self, arg):
        if not arg:
            self.say("Take what?")
            return False
        if self.battery == 0:
            self.say("It's too dark to find anything.")
            return False
        match = find_item(self.items[self.room], arg)
        if not match:
            self.say(f"There's no '{arg}' here.")
            return False
        self.items[self.room].remove(match)
        self.inventory.append(match)
        self.say(f"You take the {match}.")
        if all(piece in self.inventory for piece in KEY_PIECES):
            for piece in KEY_PIECES:
                self.inventory.remove(piece)
            self.inventory.append("front door key")
            self.say("The three pieces grind together and click into a whole key.")
        return True

    def use(self, arg):
        if not arg:
            self.say("Use what?")
            return False
        if arg in ("batteries", "battery"):
            if "batteries" not in self.inventory:
                self.say("You don't have batteries.")
                return False
            self.inventory.remove("batteries")
            self.battery = BATTERY_MAX
            self.say("You swap the batteries. The beam snaps back to life.")
            return True
        if arg in ("note", "old note"):
            if "old note" not in self.inventory:
                self.say("You don't have a note.")
                return False
            self.say(NOTE_TEXT)
            return False
        if arg in ("flashlight", "light"):
            self.say("The beam is steady for now. Batteries would help.")
            return False
        if arg in ("key", "front door key"):
            if "front door key" not in self.inventory:
                self.say("You don't have a key.")
                return False
            if self.room != "hall":
                self.say("There's nothing to unlock here.")
                return False
            return self.move("out")
        self.say("You can't use that.")
        return False

    def wait(self, _arg=""):
        self.say("You stand still and listen. The house creaks around you.")
        return True

    def hide(self, _arg=""):
        spot = ROOMS[self.room]["hide"]
        if not spot:
            self.say("There's nowhere to hide here.")
            return False
        if self.hidden:
            self.say(f"You're already crouched behind the {spot}.")
            return False
        self.hidden = True
        self.say(f"You squeeze behind the {spot} and hold your breath.")
        return True

    # ----- turn processing ----------------------------------------------

    def hurt_sanity(self, amount):
        self.sanity = max(0, self.sanity - amount)
        if self.sanity == 0 and not self.broken:
            self.broken = True
            self.break_timer = 3
            self.say(colored("Your thoughts come apart like wet paper. The words on the walls start to move.", RED))

    def encounter(self):
        if not self.hidden:
            self.finish("CAUGHT", [
                "Cold fingers close over your mouth from behind.",
                "The flashlight rolls across the floor and goes out.",
                "The house has you now.",
            ], RED)
            return
        self.say(colored("It stops in the same room as you. Inches away. You hold your breath until your lungs burn.", RED))
        self.hurt_sanity(15)
        self.entity_room = self.rng.choice(neighbors(self.room) or [self.room])
        self.entity_timer = 0
        self.say("...then it drifts away, unhurried.")

    def end_turn(self):
        self.turn += 1

        if self.battery > 0:
            self.battery -= 1
            if self.battery == 0:
                self.say(colored("Your flashlight flickers, sputters, and dies.", RED))
        elif self.battery == 0:
            self.hurt_sanity(3)

        self.entity_timer += 1
        if self.entity_timer >= ENTITY_SPEED:
            self.entity_timer = 0
            if self.rng.random() < HUNT_CHANCE:
                step = next_step(self.entity_room, self.room)
            else:
                step = self.rng.choice(neighbors(self.entity_room))  # it wanders
            if step:
                self.entity_room = step

        if self.entity_room == self.room:
            self.encounter()
        elif self.entity_room in neighbors(self.room):
            self.hurt_sanity(4)
            name = ROOMS[self.entity_room]["name"].lower()
            self.say(colored(f"Something moves in the {name}, close. Too close.", GREY))

        if self.over:
            return
        if self.broken:
            self.break_timer -= 1
            if self.break_timer <= 0:
                self.finish("SANITY BREAK", [
                    "You start laughing and can't stop.",
                    "The house settles around you like a blanket.",
                    "You stop running. You stop wanting to.",
                ], RED)

    # ----- endings -------------------------------------------------------

    def win(self):
        self.finish("YOU ESCAPED", [
            "The key turns. The front door groans open onto cold night air.",
            "You run without looking back. Behind you, the house exhales.",
        ], GREEN)

    def finish(self, title, lines, color):
        self.over = True
        self.say("")
        for line in lines:
            self.say(colored(line, color))
        self.say(colored(f"\n*** {title} ***", color + BOLD), delay=False)
        self.say(f"You survived {self.turn} turns.", delay=False)

    # ----- main loop -------------------------------------------------------

    def handle(self, line):
        verb, arg = parse_command(line)
        if verb is None:
            self.say(self.rng.choice(CREEPY_REPLIES))
            return
        if verb == "help":
            self.show_help()
            return
        if verb == "inventory":
            self.show_inventory()
            return
        if verb == "look":
            self.describe()
            return
        if verb == "quit":
            self.over = True
            self.say("You stop playing. The house keeps waiting.")
            return

        actions = {"go": self.move, "take": self.take,
                   "use": self.use, "hide": self.hide, "wait": self.wait}
        took_time = actions[verb](arg)
        if took_time and not self.over:
            self.end_turn()
            if not self.over:
                self.show_status()

    def run(self):
        for line in INTRO:
            self.say(line)
        self.describe()
        while not self.over:
            try:
                line = input(f"\n{GREY}> {RESET}")
            except EOFError:
                print()
                break
            except KeyboardInterrupt:
                print()
                break
            self.handle(line)


def main():
    parser = argparse.ArgumentParser(description="The Hollow House - a short terminal horror game.")
    parser.add_argument("--seed", type=int, default=None, help="seed for repeatable runs")
    parser.add_argument("--fast", action="store_true", help="skip the typewriter effect")
    args = parser.parse_args()

    if os.name == "nt":
        os.system("")  # enables ANSI color codes in Windows terminals

    Game(random.Random(args.seed), fast=args.fast).run()


if __name__ == "__main__":
    main()
